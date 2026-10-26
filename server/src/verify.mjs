// 题库自检：确保每道题的标准答案真的能跑、能跑对、且结果稳定。
// 运行：node server/src/verify.mjs
import { roPool, rwPool, withConn } from './db.mjs';
import { QUESTIONS, SCHEMAS, GLOSSARY } from './questions.mjs';
import {
  executeQuery,
  compareResult,
  checkSyntaxRequirement,
  explainQuery,
  resetSandbox,
  runDml,
  runVerify,
  SANDBOX_TPL,
} from './judge.mjs';

const problems = [];
const warnings = [];
const perfInfo = [];
const bad = (q, msg) => problems.push(`[${q.id}] ${msg}`);
const warn = (q, msg) => warnings.push(`[${q.id}] ${msg}`);

const cmpOpts = (q) => ({ ordered: q.ordered, roundTo: q.roundTo });

async function main() {
  // ---------- 结构检查 ----------
  const ids = new Set();
  for (const q of QUESTIONS) {
    if (ids.has(q.id)) bad(q, 'id 重复');
    ids.add(q.id);
    if (!SCHEMAS[q.schema]) bad(q, 'schema 不存在');
    if (!q.title || !q.description) bad(q, '缺标题或描述');
    if (!q.requirements?.length) bad(q, '缺要求列表');
    if (!q.expectedColumns?.length) bad(q, '缺 expectedColumns');
    if (!q.solutions?.length) bad(q, '缺备选解法');
    if (!q.followups?.length) bad(q, '缺面试追问');
    if (q.ordered && !/order\s+by/i.test(q.dml ? q.verify : q.reference)) {
      bad(q, 'ordered=true 但校验查询没有 ORDER BY');
    }

    // 讲解层：每道题都要有大白话解释和术语标注
    if (!q.plain || q.plain.length < 20) bad(q, '缺「这道题在干什么」的大白话解释（questions/explain.mjs）');
    if (!q.terms?.length) warn(q, '没有标注任何术语');
    for (const k of q.terms || []) {
      if (!GLOSSARY[k]) bad(q, `术语 key 不存在于 glossary.mjs：${k}`);
    }
  }

  const usedTerms = new Set(QUESTIONS.flatMap((q) => q.terms || []));
  for (const k of Object.keys(GLOSSARY)) {
    if (!usedTerms.has(k)) warn({ id: 'glossary' }, `术语「${GLOSSARY[k].name}」没有任何题目引用`);
  }

  // ---------- 逐题执行检查 ----------
  let okCount = 0;
  for (const q of QUESTIONS) {
    const s = SCHEMAS[q.schema];
    const before = problems.length;
    if (process.env.VERBOSE) console.log('·', q.id);

    // DML 题：判最终数据状态，不是结果集
    if (q.dml) {
      await withConn(rwPool, async (runConn) =>
        withConn(rwPool, async (checkConn) => {
          const runIn = async (tpl, sql) => {
            await resetSandbox(runConn, tpl);
            const r = await runDml(runConn, sql);
            if (!r.ok) return { ok: false, error: r.error };
            return runVerify(checkConn, q.verify);
          };

          const ref = await runIn(SANDBOX_TPL.main, q.reference);
          if (!ref.ok) {
            bad(q, `标准答案执行失败：${ref.error.title} ${ref.error.raw}`);
            return;
          }
          if (ref.columns.length !== q.expectedColumns.length) {
            bad(q, `列数不符：expectedColumns ${q.expectedColumns.length} 个，校验查询返回 ${ref.columns.length} 列（${ref.columns.join(', ')}）`);
          }

          const hid = await runIn(SANDBOX_TPL.hid, q.reference);
          if (!hid.ok) bad(q, `隐藏模板上执行失败：${hid.error.title}`);

          const again = await runIn(SANDBOX_TPL.main, q.reference);
          const stable = compareResult(ref, again, { ordered: q.ordered, roundTo: q.roundTo });
          if (!stable.ok) bad(q, `标准答案不稳定：${stable.detail || stable.reason}`);

          for (const sol of q.solutions) {
            if (sol.wrong) continue;
            const r = await runIn(SANDBOX_TPL.main, sol.sql);
            if (!r.ok) {
              bad(q, `解法「${sol.label}」执行失败：${r.error.title} ${r.error.raw}`);
              continue;
            }
            const same = compareResult(ref, r, { ordered: q.ordered, roundTo: q.roundTo });
            if (!same.ok) bad(q, `解法「${sol.label}」与标准答案不一致：${same.detail || same.reason}`);
          }
        }),
      );
      if (problems.length === before) okCount++;
      continue;
    }

    const pub = await withConn(roPool, (c) => executeQuery(c, s.db, q.reference));
    if (!pub.ok) {
      bad(q, `标准答案执行失败：${pub.error.title} ${pub.error.raw}`);
      continue;
    }
    if (pub.columns.length !== q.expectedColumns.length) {
      bad(q, `列数不符：expectedColumns 有 ${q.expectedColumns.length} 个，标准答案返回 ${pub.columns.length} 列（${pub.columns.join(', ')}）`);
    }
    if (pub.rows.length === 0) warn(q, '标准答案返回 0 行，题目可能没有区分度');
    if (pub.truncated) bad(q, '标准答案超过 5000 行上限');

    // 隐藏数据集也必须能跑
    const hid = await withConn(roPool, (c) => executeQuery(c, s.hidDb, q.reference));
    if (!hid.ok) bad(q, `隐藏数据集上执行失败：${hid.error.title}`);
    else if (hid.rows.length === 0) warn(q, '隐藏数据集上返回 0 行');

    // 稳定性：连跑两次结果必须完全一致（ordered 时连顺序也要一致）
    const again = await withConn(roPool, (c) => executeQuery(c, s.db, q.reference));
    const stable = compareResult(pub, again, cmpOpts(q));
    if (!stable.ok) bad(q, `标准答案不稳定（两次执行结果不同，可能是排序不唯一）：${stable.detail || stable.reason}`);

    // 语法要求必须被标准答案满足
    if (q.mustUse?.length) {
      const syn = checkSyntaxRequirement(q.reference, q.mustUse);
      if (!syn.ok) bad(q, `标准答案不满足 mustUse：${syn.detail}`);
    }

    // 性能题：标准答案自己必须先通过高效挡位，否则阈值就是假的
    if (q.perf) {
      const plan = await withConn(roPool, (c) => explainQuery(c, s.db, q.reference));
      const p = q.perf;
      const rowsOk = plan.rowsExamined <= p.maxRowsExamined;
      const sortOk = !p.forbidFilesort || !plan.usingFilesort;
      const accessOk = !(p.forbidAccessType || []).some((t) => plan.accessTypes.includes(t));
      if (!rowsOk || !sortOk || !accessOk) {
        bad(
          q,
          `标准答案自己没通过高效挡位：扫描 ${plan.rowsExamined} 行（上限 ${p.maxRowsExamined}）、` +
            `filesort=${plan.usingFilesort}、访问方式 ${plan.accessTypes.join('/')}`,
        );
      }
      perfInfo.push(
        `${q.id.padEnd(14)} ${String(plan.rowsExamined).padStart(6)} 行  上限 ${String(p.maxRowsExamined).padStart(6)}  ` +
          `${plan.accessTypes.join('/')}${plan.usingFilesort ? '  filesort' : ''}`,
      );

      // 标了 slow 的写法，必须真的被判为低效——否则性能挡位形同虚设
      for (const sol of q.solutions) {
        if (!sol.slow) continue;
        const bp = await withConn(roPool, (c) => explainQuery(c, s.db, sol.sql));
        const violates =
          bp.rowsExamined > p.maxRowsExamined ||
          (p.forbidFilesort && bp.usingFilesort) ||
          (p.forbidAccessType || []).some((t) => bp.accessTypes.includes(t));
        if (!violates) {
          bad(q, `解法「${sol.label}」标了 slow，但实测能通过高效挡位（${bp.rowsExamined} 行 / ${bp.accessTypes.join('/')}）`);
        }
      }
    }

    // 备选解法必须与标准答案一致
    for (const sol of q.solutions) {
      if (sol.wrong) continue;
      const r = await withConn(roPool, (c) => executeQuery(c, s.db, sol.sql));
      if (!r.ok) {
        bad(q, `解法「${sol.label}」执行失败：${r.error.title} ${r.error.raw}`);
        continue;
      }
      const same = compareResult(pub, r, cmpOpts(q));
      if (!same.ok) bad(q, `解法「${sol.label}」与标准答案不一致：${same.detail || same.reason}`);
    }

    if (problems.length === before) okCount++;
  }

  console.log(`题目总数 ${QUESTIONS.length}，全部检查通过 ${okCount}`);
  if (perfInfo.length) {
    console.log(`\n性能题执行计划（标准答案实测）：`);
    for (const p of perfInfo) console.log('  ' + p);
  }
  if (warnings.length) {
    console.log(`\n提示 ${warnings.length} 条：`);
    for (const w of warnings) console.log('  · ' + w);
  }
  if (problems.length) {
    console.log(`\n问题 ${problems.length} 条：`);
    for (const p of problems) console.log('  × ' + p);
    process.exitCode = 1;
  } else {
    console.log('\n没有发现阻塞问题。');
  }
  await roPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
