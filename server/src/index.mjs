import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';

import { roPool, rwPool, withConn } from './db.mjs';
import { SCHEMAS, QUESTIONS, findQuestion, publicQuestion, resolveTerms } from './questions.mjs';
import { guardSql, guardDml } from './errors.mjs';
import { readProfile, patchProfile } from './store.mjs';
import {
  executeQuery,
  compareResult,
  explainQuery,
  checkSyntaxRequirement,
  resetSandbox,
  runDml,
  runVerify,
  SANDBOX_TPL,
} from './judge.mjs';

const app = Fastify({ logger: { level: 'warn' } });

await app.register(cors, { origin: true });

const TIER_LABELS = {
  exec: '跑通',
  correct: '正确',
  robust: '稳健',
  perf: '高效',
  syntax: '优雅',
};

function tiersOf(list) {
  return list.map((t) => ({ ...t, label: TIER_LABELS[t.key] || t.key }));
}

app.get('/api/health', async () => {
  const [row] = await roPool.query('SELECT VERSION() AS v, CURRENT_USER() AS u');
  return { ok: true, ...row[0] };
});

app.get('/api/schemas', async () => {
  return Object.entries(SCHEMAS).map(([key, s]) => ({
    key,
    label: s.label,
    intro: s.intro,
    tables: s.tables,
  }));
});

app.get('/api/questions', async () => {
  return QUESTIONS.map((q) => ({
    id: q.id,
    module: q.module,
    difficulty: q.difficulty,
    title: q.title,
    schema: q.schema,
    tags: q.tags,
    hasPerf: !!q.perf,
    mustUse: q.mustUse || [],
    dml: !!q.dml,
  }));
});

app.get('/api/questions/:id', async (req, reply) => {
  const q = findQuestion(req.params.id);
  if (!q) return reply.code(404).send({ message: '题目不存在' });
  return { ...publicQuestion(q), schemaMeta: SCHEMAS[q.schema] };
});

// ---------- 做题记录（服务端持久化） ----------
app.get('/api/profile', async () => readProfile());

app.patch('/api/profile', async (req) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  return patchProfile(body);
});

// sendBeacon 只能发 POST，关页面前用它兜底
app.post('/api/profile', async (req) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  return patchProfile(body);
});

app.get('/api/questions/:id/solution', async (req, reply) => {
  const q = findQuestion(req.params.id);
  if (!q) return reply.code(404).send({ message: '题目不存在' });
  return {
    plain: q.plain,
    terms: resolveTerms(q.terms),
    solutions: q.solutions,
    followups: q.followups,
  };
});

function resolve(req, reply) {
  const { questionId, sql } = req.body || {};
  const q = findQuestion(questionId);
  if (!q) {
    reply.code(404).send({ message: '题目不存在' });
    return null;
  }
  const guard = q.dml ? guardDml(sql) : guardSql(sql);
  if (!guard.ok) {
    reply.code(400).send({ message: guard.message });
    return null;
  }
  return { q, sql, schema: SCHEMAS[q.schema] };
}

// 沙盒只有一个，并发请求会互相踩，串行化
let sandboxQueue = Promise.resolve();
function sandboxLock(fn) {
  const p = sandboxQueue.then(fn, fn);
  sandboxQueue = p.then(
    () => {},
    () => {},
  );
  return p;
}

// DML 判题：跑参考解取期望状态 → 重置 → 跑用户解 → 比对最终数据
// 关键点：执行和校验用两个连接。这样"忘了 COMMIT"的事务读不到，判题会正确地判失败。
async function judgeDml(q, sql) {
  return sandboxLock(() =>
    withConn(rwPool, async (runConn) =>
      withConn(rwPool, async (checkConn) => {
        try {
          await resetSandbox(runConn, SANDBOX_TPL.main);
          const refRun = await runDml(runConn, q.reference);
          if (!refRun.ok) return { internal: `标准答案执行失败：${refRun.error.title} ${refRun.error.raw}` };
          const refState = await runVerify(checkConn, q.verify);
          if (!refState.ok) return { internal: `校验查询失败：${refState.error.title}` };

          await resetSandbox(runConn, SANDBOX_TPL.main);
          const userRun = await runDml(runConn, sql);
          if (!userRun.ok) return { execFail: userRun.error };
          const userState = await runVerify(checkConn, q.verify);

          await resetSandbox(runConn, SANDBOX_TPL.hid);
          await runDml(runConn, q.reference);
          const hidRef = await runVerify(checkConn, q.verify);
          await resetSandbox(runConn, SANDBOX_TPL.hid);
          const hidRun = await runDml(runConn, sql);
          const hidState = hidRun.ok ? await runVerify(checkConn, q.verify) : null;

          return { refState, userRun, userState, hidRef, hidState, hidRun };
        } finally {
          try {
            await runConn.query('ROLLBACK');
          } catch {}
        }
      }),
    ),
  );
}

app.post('/api/run', async (req, reply) => {
  const ctx = resolve(req, reply);
  if (!ctx) return;

  // DML 题：在干净沙盒里跑一遍，返回影响行数和最终数据
  if (ctx.q.dml) {
    return sandboxLock(() =>
      withConn(rwPool, async (runConn) =>
        withConn(rwPool, async (checkConn) => {
          try {
            await resetSandbox(runConn, SANDBOX_TPL.main);
            const run = await runDml(runConn, ctx.sql);
            if (!run.ok) return { ok: false, error: run.error };
            const st = await runVerify(checkConn, ctx.q.verify);
            if (!st.ok) return { ok: false, error: st.error };
            return {
              ok: true,
              dml: true,
              affected: run.affected,
              columns: st.columns,
              rows: st.rows,
              rowCount: st.rowCount,
              elapsed: 0,
            };
          } finally {
            try {
              await runConn.query('ROLLBACK');
            } catch {}
          }
        }),
      ),
    );
  }

  const result = await withConn(roPool, (c) => executeQuery(c, ctx.schema.db, ctx.sql));
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
    truncated: result.truncated,
    elapsed: result.elapsed,
  };
});

app.post('/api/explain', async (req, reply) => {
  const ctx = resolve(req, reply);
  if (!ctx) return;
  try {
    const plan = await withConn(roPool, (c) => explainQuery(c, ctx.schema.db, ctx.sql));
    return { ok: true, plan };
  } catch (err) {
    return { ok: false, error: { title: '无法生成执行计划', raw: err.sqlMessage || err.message } };
  }
});

app.post('/api/submit', async (req, reply) => {
  const ctx = resolve(req, reply);
  if (!ctx) return;
  const { q, sql, schema } = ctx;

  // ---------- DML 题：判最终数据状态 ----------
  if (q.dml) {
    const r = await judgeDml(q, sql);
    if (r.internal) {
      return { passed: false, tiers: tiersOf([{ key: 'exec', status: 'fail', detail: r.internal }]), result: null };
    }
    if (r.execFail) {
      return {
        passed: false,
        tiers: tiersOf([
          { key: 'exec', status: 'fail', detail: r.execFail.title, error: r.execFail },
          { key: 'correct', status: 'skip' },
          { key: 'robust', status: 'skip' },
        ]),
        result: null,
      };
    }

    const dmlTiers = [];
    dmlTiers.push({
      key: 'exec',
      status: 'pass',
      detail: `${r.userRun.statementCount} 条语句，共 ${r.userRun.affected} 行受影响`,
    });

    const cmpOpts = { ordered: q.ordered, roundTo: q.roundTo };
    const cmp = compareResult(r.refState, r.userState, cmpOpts);
    if (cmp.ok) {
      dmlTiers.push({ key: 'correct', status: 'pass', detail: `最终数据与标准答案一致（${r.refState.rowCount} 行）` });
    } else {
      dmlTiers.push({
        key: 'correct',
        status: 'fail',
        detail: cmp.detail || '最终数据和标准答案不一致',
        diff: cmp.diff || null,
        reason: cmp.reason,
      });
    }

    if (cmp.ok) {
      if (!r.hidRun.ok) {
        dmlTiers.push({ key: 'robust', status: 'fail', detail: '换一套初始数据后执行失败：' + r.hidRun.error.title });
      } else {
        const hc = compareResult(r.hidRef, r.hidState, cmpOpts);
        dmlTiers.push(
          hc.ok
            ? { key: 'robust', status: 'pass', detail: '换一套初始数据仍然正确' }
            : { key: 'robust', status: 'fail', detail: '换一套初始数据后结果不对' + (hc.detail ? '：' + hc.detail : '') },
        );
      }
    } else {
      dmlTiers.push({ key: 'robust', status: 'skip', detail: '先通过正确性检查' });
    }

    const passed = dmlTiers.every((t) => t.status !== 'fail');
    return {
      passed,
      tiers: tiersOf(dmlTiers),
      result: {
        columns: r.userState.columns,
        rows: r.userState.rows,
        rowCount: r.userState.rowCount,
        elapsed: 0,
        dml: true,
      },
    };
  }

  const tiers = [];

  // L1 跑通
  const actual = await withConn(roPool, (c) => executeQuery(c, schema.db, sql));
  if (!actual.ok) {
    tiers.push({ key: 'exec', status: 'fail', detail: actual.error.title, error: actual.error });
    tiers.push({ key: 'correct', status: 'skip' });
    tiers.push({ key: 'robust', status: 'skip' });
    if (q.perf) tiers.push({ key: 'perf', status: 'skip' });
    if (q.mustUse?.length) tiers.push({ key: 'syntax', status: 'skip' });
    return { passed: false, tiers: tiersOf(tiers), result: null };
  }
  tiers.push({ key: 'exec', status: 'pass', detail: `${actual.rowCount} 行 / ${actual.elapsed}ms` });

  // L2 正确（公开数据集）
  const expected = await withConn(roPool, (c) => executeQuery(c, schema.db, q.reference));
  const cmp = compareResult(expected, actual, { ordered: q.ordered, roundTo: q.roundTo });
  if (cmp.ok) {
    tiers.push({ key: 'correct', status: 'pass', detail: `结果集与标准答案一致（${expected.rows.length} 行）` });
  } else {
    tiers.push({
      key: 'correct',
      status: 'fail',
      detail: cmp.detail || '结果与标准答案不一致',
      diff: cmp.diff || null,
      reason: cmp.reason,
    });
  }

  // L3 稳健（隐藏数据集复跑）
  if (cmp.ok) {
    const [hidActual, hidExpected] = await Promise.all([
      withConn(roPool, (c) => executeQuery(c, schema.hidDb, sql)),
      withConn(roPool, (c) => executeQuery(c, schema.hidDb, q.reference)),
    ]);
    if (!hidActual.ok) {
      tiers.push({ key: 'robust', status: 'fail', detail: '在隐藏数据集上执行失败：' + hidActual.error.title });
    } else {
      const hidCmp = compareResult(hidExpected, hidActual, { ordered: q.ordered, roundTo: q.roundTo });
      tiers.push(
        hidCmp.ok
          ? { key: 'robust', status: 'pass', detail: '换一套数据仍然正确（含边界数据）' }
          : {
              key: 'robust',
              status: 'fail',
              detail: '在隐藏数据集上结果不一致，说明写法没有覆盖全部情况' + (hidCmp.detail ? '：' + hidCmp.detail : ''),
            },
      );
    }
  } else {
    tiers.push({ key: 'robust', status: 'skip', detail: '先通过正确性检查' });
  }

  // L4 高效（执行计划）
  if (q.perf) {
    try {
      const plan = await withConn(roPool, (c) => explainQuery(c, schema.db, sql));
      const limit = q.perf.maxRowsExamined;
      const rowsOk = plan.rowsExamined <= limit;
      const sortOk = !q.perf.forbidFilesort || !plan.usingFilesort;
      const badAccess = (q.perf.forbidAccessType || []).filter((t) => plan.accessTypes.includes(t));
      const accessOk = badAccess.length === 0;
      const okPerf = rowsOk && sortOk && accessOk;
      const reasons = [];
      if (!rowsOk) reasons.push(`扫描约 ${plan.rowsExamined} 行，超过上限 ${limit} 行`);
      if (!sortOk) reasons.push('排序没有走索引，产生了 filesort');
      if (!accessOk) reasons.push(`访问方式是 ${badAccess.join('/')}，说明没定位到范围`);
      tiers.push({
        key: 'perf',
        status: okPerf ? 'pass' : 'fail',
        detail: okPerf
          ? `扫描约 ${plan.rowsExamined} 行（上限 ${limit}），访问方式 ${plan.accessTypes.join('/')}${q.perf.forbidFilesort ? '，无 filesort' : ''}`
          : `${reasons.join('；')}${plan.fullScan ? '（存在全表扫描）' : ''}。${q.perf.note || ''}`,
        plan: {
          rowsExamined: plan.rowsExamined,
          accessTypes: plan.accessTypes,
          fullScan: plan.fullScan,
          usingFilesort: plan.usingFilesort,
          usingTemporaryTable: plan.usingTemporaryTable,
          tables: plan.tables,
          limit,
        },
      });
    } catch (err) {
      tiers.push({ key: 'perf', status: 'skip', detail: '执行计划解析失败：' + (err.message || '') });
    }
  }

  // L5 优雅（语法要求）
  if (q.mustUse?.length) {
    const syn = checkSyntaxRequirement(sql, q.mustUse);
    tiers.push(
      syn.ok
        ? { key: 'syntax', status: 'pass', detail: '满足本题的写法要求' }
        : { key: 'syntax', status: 'fail', detail: syn.detail },
    );
  }

  const passed = tiers.every((t) => t.status === 'pass' || t.status === 'skip');
  return {
    passed,
    tiers: tiersOf(tiers),
    result: {
      columns: actual.columns,
      rows: actual.rows,
      rowCount: actual.rowCount,
      elapsed: actual.elapsed,
      truncated: actual.truncated,
    },
  };
});

const distDir = path.join(import.meta.dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(distDir)) {
  await app.register(fastifyStatic, { root: distDir });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api')) return reply.code(404).send({ message: 'not found' });
    return reply.sendFile('index.html');
  });
}

const port = Number(process.env.PORT || 3001);
await app.listen({ port, host: '127.0.0.1' });
console.log(`判题服务已启动: http://127.0.0.1:${port}`);
