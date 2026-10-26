// 判题引擎自测：用已知正确/错误的写法验证五个挡位是否按预期工作。
// 运行：node src/selftest.mjs
const BASE = process.env.BASE || 'http://127.0.0.1:3001';

const Q1_OK = `SELECT d.name AS dept_name, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employees)
ORDER BY avg_salary DESC`;

const Q1_BAD = `SELECT d.name AS dept_name, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY avg_salary DESC`;

const Q2_OK = `SELECT t.dept_name, t.name, t.salary, t.rk FROM (
  SELECT d.name AS dept_name, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk
  FROM employees e JOIN departments d ON d.id = e.dept_id
) t WHERE t.rk <= 2 ORDER BY t.dept_name, t.rk, t.name`;

const Q2_ROW_NUMBER = Q2_OK.replace('DENSE_RANK()', 'ROW_NUMBER()');

const Q2_NO_WINDOW = `SELECT d.name AS dept_name, e.name, e.salary,
  (SELECT COUNT(DISTINCT e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id AND e2.salary > e.salary) + 1 AS rk
FROM employees e JOIN departments d ON d.id = e.dept_id
HAVING rk <= 2 ORDER BY dept_name, rk, name`;

const Q3_OK = `SELECT e.id, e.name, e.title FROM employees e
LEFT JOIN employee_projects ep ON ep.employee_id = e.id
WHERE ep.employee_id IS NULL ORDER BY e.id`;

const Q4_OK = `SELECT id, total_amount FROM orders
WHERE status = 'completed' AND order_date >= '2024-03-01 00:00:00' AND order_date < '2024-04-01 00:00:00'
ORDER BY total_amount DESC, id LIMIT 20`;

const Q4_SLOW = `SELECT id, total_amount FROM orders
WHERE status = 'completed' AND DATE_FORMAT(order_date, '%Y-%m') = '2024-03'
ORDER BY total_amount DESC, id LIMIT 20`;

const CASES = [
  { name: 'Q1 标准答案 → 全部通过', q: 'cmp-agg-01', sql: Q1_OK, expect: { passed: true } },
  { name: 'Q1 漏掉 HAVING → 正确性失败', q: 'cmp-agg-01', sql: Q1_BAD, expect: { passed: false, fail: 'correct' } },
  { name: 'Q2 DENSE_RANK → 通过（含语法挡位）', q: 'cmp-win-01', sql: Q2_OK, expect: { passed: true } },
  { name: 'Q2 误用 ROW_NUMBER → 并列处理错误', q: 'cmp-win-01', sql: Q2_ROW_NUMBER, expect: { passed: false, fail: 'correct' } },
  { name: 'Q2 不用窗口函数 → 只挂语法挡位', q: 'cmp-win-01', sql: Q2_NO_WINDOW, expect: { passed: false, fail: 'syntax' } },
  { name: 'Q3 LEFT JOIN 反连接 → 通过', q: 'cmp-join-01', sql: Q3_OK, expect: { passed: true } },
  { name: 'Q4 范围条件 → 通过（含性能挡位）', q: 'shop-perf-01', sql: Q4_OK, expect: { passed: true } },
  { name: 'Q4 函数包列 → 正确但性能不达标', q: 'shop-perf-01', sql: Q4_SLOW, expect: { passed: false, fail: 'perf' } },
  { name: '语法错误 → 第一挡就挂', q: 'cmp-agg-01', sql: 'SELEC * FORM employees', expect: { passed: false, fail: 'exec' } },
  { name: '写操作被拦截', q: 'cmp-agg-01', sql: 'DELETE FROM employees', expect: { blocked: true } },
];

let pass = 0;
for (const c of CASES) {
  const res = await fetch(`${BASE}/api/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ questionId: c.q, sql: c.sql }),
  });
  const body = await res.json();
  let ok = true;
  let desc = '';

  if (c.expect.blocked) {
    ok = res.status === 400;
    desc = body.message || '';
  } else {
    ok = body.passed === c.expect.passed;
    if (c.expect.fail) {
      const t = body.tiers?.find((x) => x.key === c.expect.fail);
      ok = ok && t?.status === 'fail';
      desc = t?.detail || '';
    }
    const lights = (body.tiers || []).map((t) => `${t.label}:${t.status}`).join(' ');
    desc = `${lights} | ${desc}`;
  }

  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  console.log(`      ${desc.slice(0, 160)}`);
}

console.log(`\n${pass}/${CASES.length} 通过`);
process.exit(pass === CASES.length ? 0 : 1);
