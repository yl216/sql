import { translateError } from './errors.mjs';

const MAX_TIME = 8000;
const MAX_ROWS = 5000;

export async function executeQuery(conn, dbName, sql) {
  const started = Date.now();
  await conn.query(`USE \`${dbName}\``);
  await conn.query(`SET SESSION max_execution_time = ${MAX_TIME}`);
  try {
    const [rows, fields] = await conn.query(sql);
    const elapsed = Date.now() - started;
    if (!Array.isArray(rows)) {
      return {
        ok: true,
        kind: 'command',
        columns: [],
        rows: [],
        rowCount: rows.affectedRows ?? 0,
        elapsed,
      };
    }
    const columns = (fields || []).map((f) => f.name);
    const matrix = rows.map((r) => (Array.isArray(r) ? r : columns.map((c) => r[c])));
    const truncated = matrix.length > MAX_ROWS;
    return {
      ok: true,
      kind: 'select',
      columns,
      rows: truncated ? matrix.slice(0, MAX_ROWS) : matrix,
      rowCount: matrix.length,
      truncated,
      elapsed,
    };
  } catch (err) {
    return { ok: false, error: translateError(err), elapsed: Date.now() - started };
  }
}

const NUM_RE = /^-?\d+(\.\d+)?$/;

export function normValue(v) {
  if (v === null || v === undefined) return '\u0000NULL';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '\u0000NaN';
    return String(Math.round(v * 1e6) / 1e6);
  }
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return v.toISOString();
  if (Buffer.isBuffer(v)) return v.toString('base64');
  if (typeof v === 'string') {
    const t = v.trim();
    if (t !== '' && NUM_RE.test(t)) return String(Math.round(Number(t) * 1e6) / 1e6);
    return v;
  }
  return JSON.stringify(v);
}

function rowKey(row) {
  return JSON.stringify(row.map(normValue));
}

function diffRows(expectedRows, actualRows, columns) {
  const expMap = new Map();
  for (const r of expectedRows) {
    const k = rowKey(r);
    expMap.set(k, (expMap.get(k) || 0) + 1);
  }
  const missing = [];
  const extra = [];
  const actMap = new Map();
  for (const r of actualRows) {
    const k = rowKey(r);
    actMap.set(k, (actMap.get(k) || 0) + 1);
  }
  for (const [k, n] of expMap) {
    const got = actMap.get(k) || 0;
    for (let i = got; i < n; i++) missing.push(JSON.parse(k));
  }
  for (const [k, n] of actMap) {
    const want = expMap.get(k) || 0;
    for (let i = want; i < n; i++) extra.push(JSON.parse(k));
  }
  return {
    missing: missing.slice(0, 5).map((r) => r.map((x) => (x === '\u0000NULL' ? null : x))),
    extra: extra.slice(0, 5).map((r) => r.map((x) => (x === '\u0000NULL' ? null : x))),
    missingCount: missing.length,
    extraCount: extra.length,
    columns,
  };
}

function roundVal(v, n) {
  const p = 10 ** n;
  if (v === null || v === undefined) return v;
  if (typeof v === 'number') return Math.round(v * p) / p;
  if (typeof v === 'string' && NUM_RE.test(v.trim())) return Math.round(Number(v) * p) / p;
  return v;
}

export function compareResult(expectedIn, actualIn, opts = {}) {
  const { ordered = false, compareColumns = false, roundTo = null } = opts;
  const roundRows = (r) => (roundTo == null ? r : r.map((row) => row.map((v) => roundVal(v, roundTo))));
  const expected = roundTo == null ? expectedIn : { ...expectedIn, rows: roundRows(expectedIn.rows) };
  const actual = roundTo == null ? actualIn : { ...actualIn, rows: roundRows(actualIn.rows) };

  if (!actual.ok) return { ok: false, reason: 'exec-error' };
  if (actual.kind !== 'select') return { ok: false, reason: 'not-select' };
  if (actual.truncated) {
    return { ok: false, reason: 'too-many-rows', detail: `结果超过 ${MAX_ROWS} 行，请检查是不是漏了过滤条件或 JOIN 条件` };
  }
  if (actual.columns.length !== expected.columns.length) {
    return {
      ok: false,
      reason: 'column-count',
      detail: `需要返回 ${expected.columns.length} 列（${expected.columns.join(', ')}），你返回了 ${actual.columns.length} 列`,
    };
  }
  if (compareColumns) {
    const a = actual.columns.map((c) => c.toLowerCase());
    const e = expected.columns.map((c) => c.toLowerCase());
    if (a.join('|') !== e.join('|')) {
      return { ok: false, reason: 'column-name', detail: `列名不一致：期望 ${e.join(', ')}，实际 ${a.join(', ')}` };
    }
  }
  if (actual.rows.length !== expected.rows.length) {
    const d = diffRows(expected.rows, actual.rows, expected.columns);
    return {
      ok: false,
      reason: 'row-count',
      detail: `期望 ${expected.rows.length} 行，实际 ${actual.rows.length} 行`,
      diff: d,
    };
  }

  if (ordered) {
    for (let i = 0; i < expected.rows.length; i++) {
      if (rowKey(expected.rows[i]) !== rowKey(actual.rows[i])) {
        const d = diffRows(expected.rows, actual.rows, expected.columns);
        return {
          ok: false,
          reason: 'order',
          detail: `第 ${i + 1} 行开始与标准答案不一致（本题要求按指定顺序输出）`,
          diff: d,
        };
      }
    }
    return { ok: true };
  }

  const d = diffRows(expected.rows, actual.rows, expected.columns);
  if (d.missingCount || d.extraCount) {
    return { ok: false, reason: 'rows', detail: '结果集内容不一致', diff: d };
  }
  return { ok: true };
}

function collectTables(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) {
    for (const n of node) collectTables(n, acc);
    return acc;
  }
  if (node.table && typeof node.table === 'object' && node.table.access_type) acc.push(node.table);
  for (const k of Object.keys(node)) {
    if (k === 'table') continue;
    collectTables(node[k], acc);
  }
  return acc;
}

function deepFindTrue(node, key) {
  if (!node || typeof node !== 'object') return false;
  if (node[key] === true) return true;
  for (const k of Object.keys(node)) {
    if (deepFindTrue(node[k], key)) return true;
  }
  return false;
}

export async function explainQuery(conn, dbName, sql) {
  await conn.query(`USE \`${dbName}\``);
  const [rows] = await conn.query(`EXPLAIN FORMAT=JSON ${sql}`);
  const raw = rows[0]?.EXPLAIN ?? Object.values(rows[0] || {})[0];
  const plan = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const tables = collectTables(plan);
  const rowsExamined = tables.reduce((s, t) => s + (t.rows_examined_per_scan || 0), 0);
  const accessTypes = [...new Set(tables.map((t) => t.access_type))];
  return {
    rowsExamined,
    accessTypes,
    fullScan: accessTypes.includes('ALL'),
    usingFilesort: deepFindTrue(plan, 'using_filesort'),
    usingTemporaryTable: deepFindTrue(plan, 'using_temporary_table'),
    tables: tables.map((t) => ({
      table: t.table_name,
      accessType: t.access_type,
      rowsExamined: t.rows_examined_per_scan,
      key: t.key || null,
    })),
    raw: plan,
  };
}

const SYNTAX_CHECKS = {
  window: { re: /\bover\s*\(/i, label: '窗口函数（OVER 子句）' },
  cte: { re: /\bwith\b[\s\S]+?\bas\s*\(/i, label: 'CTE（WITH 子句）' },
  join: { re: /\bjoin\b/i, label: 'JOIN 连接' },
  exists: { re: /\bexists\b/i, label: 'EXISTS 子查询' },
  having: { re: /\bhaving\b/i, label: 'HAVING' },
};

export function checkSyntaxRequirement(sql, mustUse) {
  if (!mustUse || !mustUse.length) return { ok: true, skipped: true };
  const body = sql.replace(/'(?:[^'\\]|\\.|'')*'/g, "''").replace(/--[^\n]*/g, ' ');
  const missing = mustUse.filter((k) => !SYNTAX_CHECKS[k]?.re.test(body));
  if (missing.length) {
    return {
      ok: false,
      detail: `本题要求使用：${missing.map((k) => SYNTAX_CHECKS[k]?.label || k).join('、')}`,
    };
  }
  return { ok: true };
}

export { MAX_TIME, MAX_ROWS };

// ---------- DML 沙盒 ----------
// 每次判题前从模板库整表重建，保证起点一致。表很小（8/40/7 行），重建成本可以忽略。
export const SANDBOX_DB = 'sqlprac_sandbox';
export const SANDBOX_TPL = { main: 'sqlprac_sandbox_tpl', hid: 'sqlprac_sandbox_tpl_hid' };
const SANDBOX_DROP_ORDER = ['emp', 'account', 'dept']; // 先删带外键的子表
const SANDBOX_CREATE_ORDER = ['dept', 'emp', 'account']; // 先建父表

export async function resetSandbox(conn, tplDb) {
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${SANDBOX_DB}\` DEFAULT CHARSET utf8mb4`);
  await conn.query(`USE \`${SANDBOX_DB}\``);
  await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
  for (const t of SANDBOX_DROP_ORDER) await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
  await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
  for (const t of SANDBOX_CREATE_ORDER) {
    await conn.query(`CREATE TABLE \`${t}\` LIKE \`${tplDb}\`.\`${t}\``);
    await conn.query(`INSERT INTO \`${t}\` SELECT * FROM \`${tplDb}\`.\`${t}\``);
  }
}

export async function runDml(conn, sql) {
  await conn.query(`USE \`${SANDBOX_DB}\``);
  try {
    const [result] = await conn.query(sql);
    const list = Array.isArray(result) ? result : [result];
    let affected = 0;
    for (const r of list) {
      if (r && typeof r === 'object' && !Array.isArray(r) && 'affectedRows' in r) affected += r.affectedRows;
    }
    return { ok: true, affected, statementCount: list.length };
  } catch (err) {
    return { ok: false, error: translateError(err) };
  }
}

export async function runVerify(conn, sql) {
  await conn.query(`USE \`${SANDBOX_DB}\``);
  try {
    const [rows, fields] = await conn.query(sql);
    const columns = (fields || []).map((f) => f.name);
    const matrix = (Array.isArray(rows) ? rows : []).map((r) => columns.map((c) => r[c]));
    return { ok: true, kind: 'select', columns, rows: matrix, rowCount: matrix.length };
  } catch (err) {
    return { ok: false, error: translateError(err) };
  }
}
