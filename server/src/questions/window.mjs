// 模块 4：窗口函数
export const WINDOW = [
  {
    id: 'win-01',
    module: '窗口函数',
    difficulty: 2,
    title: '给每个部门的人编号',
    schema: 'company',
    tags: ['ROW_NUMBER', 'PARTITION BY'],
    description:
      '在每个部门内部，按薪资从高到低给员工编上 1、2、3……的序号，取每个部门的前 5 名。这是窗口函数最基础的用法：它只加一列序号，不会像 GROUP BY 那样把明细行合并掉。',
    requirements: ['输出 4 列：dept_name、name、salary、rn', 'rn 是部门内按薪资降序的序号，从 1 开始', '只保留 rn <= 5 的行', '按 dept_name 升序、rn 升序'],
    expectedColumns: ['dept_name', 'name', 'salary', 'rn'],
    reference: `SELECT dept_name, name, salary, rn
FROM (
  SELECT d.name AS dept_name, e.name, e.salary, e.id,
         ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) t
WHERE rn <= 5
ORDER BY dept_name, rn`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'ROW_NUMBER + 子查询过滤',
        sql: `SELECT dept_name, name, salary, rn FROM (SELECT d.name AS dept_name, e.name, e.salary, e.id, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn FROM employees e JOIN departments d ON d.id = e.dept_id) t WHERE rn <= 5 ORDER BY dept_name, rn`,
        note: '窗口函数先算出序号，外层再按序号筛。ORDER BY 里加 e.id 是为了让同薪资的人有确定先后——否则每次运行谁排第 1 可能变。',
      },
      {
        label: 'CTE 写法',
        sql: `WITH ranked AS (SELECT d.name AS dept_name, e.name, e.salary, e.id, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn FROM employees e JOIN departments d ON d.id = e.dept_id) SELECT dept_name, name, salary, rn FROM ranked WHERE rn <= 5 ORDER BY dept_name, rn`,
        note: '逻辑一样，只是把子查询换成 WITH。行数多、逻辑长的时候，CTE 读起来更像分步骤。',
      },
    ],
    followups: [
      '为什么窗口函数不能直接写在 WHERE 里？',
      'ROW_NUMBER 和 GROUP BY 加 COUNT 的本质区别是什么？',
      '如果把 PARTITION BY 去掉，rn 会变成什么？',
    ],
  },

  {
    id: 'win-02',
    module: '窗口函数',
    difficulty: 3,
    title: '三种排名放在一起对比',
    schema: 'company',
    tags: ['RANK', 'DENSE_RANK', 'ROW_NUMBER'],
    description:
      '同一个部门、同一份薪资数据，用三种排名函数各算一遍。有并列时它们的表现完全不同，这是面试里最爱追问的一个点。只取每个部门排名前 3 的人。',
    requirements: ['输出 6 列：dept_name、name、salary、rn、rk、drk', 'rn 用 ROW_NUMBER，rk 用 RANK，drk 用 DENSE_RANK，都按部门内薪资降序', '只保留 rk <= 3 的行', '按 dept_name、salary 降序、id 升序排列'],
    expectedColumns: ['dept_name', 'name', 'salary', 'rn', 'rk', 'drk'],
    reference: `SELECT dept_name, name, salary, rn, rk, drk
FROM (
  SELECT d.name AS dept_name, e.name, e.salary, e.id,
         ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn,
         RANK()       OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS drk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) t
WHERE rk <= 3
ORDER BY dept_name, salary DESC, id`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '三个函数并排',
        sql: `SELECT dept_name, name, salary, rn, rk, drk FROM (SELECT d.name AS dept_name, e.name, e.salary, e.id, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn, RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk, DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS drk FROM employees e JOIN departments d ON d.id = e.dept_id) t WHERE rk <= 3 ORDER BY dept_name, salary DESC, id`,
        note: '注意 rn 的排序里多了 e.id，另外两个没有——因为 ROW_NUMBER 必须靠一个唯一列才能保证结果稳定，而 RANK 要的就是"并列"。',
      },
      {
        label: 'CTE 写法',
        sql: `WITH ranked AS (SELECT d.name AS dept_name, e.name, e.salary, e.id, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn, RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk, DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS drk FROM employees e JOIN departments d ON d.id = e.dept_id) SELECT dept_name, name, salary, rn, rk, drk FROM ranked WHERE rk <= 3 ORDER BY dept_name, salary DESC, id`,
        note: '把子查询换成 WITH，逻辑一字不差。三个排名函数的参数完全一样，只有函数名不同——差异全在"遇到并列时怎么处理"。',
      },
    ],
    followups: [
      '薪资 100、100、90 三个人，三种函数分别给出什么名次？',
      '要取"每个部门前 2 名且并列都算"，该用哪个函数？要取"就 2 个人"呢？',
      '为什么 ROW_NUMBER 的 ORDER BY 里必须补一个唯一列？',
    ],
  },

  {
    id: 'win-03',
    module: '窗口函数',
    difficulty: 3,
    title: '把员工按薪资分成四档',
    schema: 'company',
    tags: ['NTILE', '分桶'],
    description:
      '把全公司 5000 人按薪资从低到高平均切成 4 桶，看看每桶的薪资区间。分桶是做用户分层、成绩分档最常用的手法。',
    requirements: ['输出 4 列：bucket、employees、min_salary、max_salary', '用 NTILE(4) 按 salary 升序分桶', '每个桶一行', '按 bucket 升序'],
    expectedColumns: ['bucket', 'employees', 'min_salary', 'max_salary'],
    reference: `SELECT bucket, COUNT(*) AS employees, MIN(salary) AS min_salary, MAX(salary) AS max_salary
FROM (
  SELECT salary, NTILE(4) OVER (ORDER BY salary, id) AS bucket
  FROM employees
) t
GROUP BY bucket
ORDER BY bucket`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'NTILE(4) 分桶再聚合',
        sql: `SELECT bucket, COUNT(*) AS employees, MIN(salary) AS min_salary, MAX(salary) AS max_salary FROM (SELECT salary, NTILE(4) OVER (ORDER BY salary, id) AS bucket FROM employees) t GROUP BY bucket ORDER BY bucket`,
        note: 'NTILE 负责"切"，外层 GROUP BY 负责"汇总每桶"。这两个是分工关系，不能混在一次 GROUP BY 里。',
      },
      {
        label: '用总人数算分位点',
        sql: `SELECT bucket, COUNT(*) AS employees, MIN(salary) AS min_salary, MAX(salary) AS max_salary FROM (SELECT salary, CEIL(ROW_NUMBER() OVER (ORDER BY salary, id) / (COUNT(*) OVER () / 4)) AS bucket FROM employees) t GROUP BY bucket ORDER BY bucket`,
        note: '手写分桶逻辑：序号除以每桶人数再向上取整。能跑对，但 NTILE 已经把这个逻辑封好了，没必要自己算。',
      },
    ],
    followups: [
      'NTILE(4) 在人数除不尽时会怎么办？',
      'NTILE 和 PERCENT_RANK、CUME_DIST 有什么区别？',
      '如果按"部门内部分桶"，PARTITION BY 要加在哪？',
    ],
  },

  {
    id: 'win-04',
    module: '窗口函数',
    difficulty: 3,
    title: '每个部门第 3 高的薪资',
    schema: 'company',
    tags: ['DENSE_RANK', 'N 高问题'],
    description:
      '"第 N 高"是面试高频题。用 DENSE_RANK 排完取第 3 名，注意如果有多人并列第 3，他们会一起返回。',
    requirements: ['输出 2 列：dept_name、salary', '只保留部门内薪资排名（DENSE_RANK）正好等于 3 的行', '按 dept_name 升序、salary 降序'],
    expectedColumns: ['dept_name', 'salary'],
    reference: `SELECT dept_name, salary
FROM (
  SELECT d.name AS dept_name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS drk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) t
WHERE drk = 3
ORDER BY dept_name, salary DESC`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'DENSE_RANK = 3',
        sql: `SELECT dept_name, salary FROM (SELECT d.name AS dept_name, e.salary, DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS drk FROM employees e JOIN departments d ON d.id = e.dept_id) t WHERE drk = 3 ORDER BY dept_name, salary DESC`,
        note: '用 DENSE_RANK 而不是 RANK：如果第 1 名有 3 个人并列，RANK 会让下一名直接变成 4，就再也找不到"第 3 高"了。',
      },
      {
        label: '用 LIMIT 偏移',
        sql: `SELECT d.name AS dept_name, e.salary FROM departments d JOIN employees e ON e.dept_id = d.id WHERE (SELECT COUNT(DISTINCT e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id AND e2.salary > e.salary) = 2 ORDER BY dept_name, salary DESC`,
        note: '数"比我高的不同薪资有几个"，正好 2 个就说明我是第 3 高。不用窗口函数，但每个员工都要扫一遍同部门。',
      },
    ],
    followups: [
      '如果第 1 名有 5 个人并列，用 RANK 取 drk=3 会出什么问题？',
      '"第 3 高"和"排名第 3 的人"是一回事吗？',
      '部门人数不足 3 人时，这条 SQL 会返回什么？',
    ],
  },

  {
    id: 'win-05',
    module: '窗口函数',
    difficulty: 3,
    title: '研发部的薪资累计',
    schema: 'company',
    tags: ['累计求和', 'ROWS BETWEEN'],
    description:
      '把研发部的人按薪资从高到低排好，逐行累加：第 1 行是自己，第 2 行是前两人之和……看看到第几个人时累计薪资超过部门总额的一半。',
    requirements: ['输出 3 列：name、salary、running_total', 'running_total 是从最高薪开始累加到当前行的和', '按 salary 降序、id 升序排列', '只取前 20 行'],
    expectedColumns: ['name', 'salary', 'running_total'],
    reference: `SELECT name, salary, SUM(salary) OVER (ORDER BY salary DESC, id) AS running_total
FROM (
  SELECT e.id, e.name, e.salary
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
  WHERE d.name = '研发部'
) t
ORDER BY salary DESC, id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'SUM() OVER (ORDER BY ...)',
        sql: `SELECT name, salary, SUM(salary) OVER (ORDER BY salary DESC, id) AS running_total FROM (SELECT e.id, e.name, e.salary FROM employees e JOIN departments d ON d.id = e.dept_id WHERE d.name = '研发部') t ORDER BY salary DESC, id LIMIT 20`,
        note: 'SUM 加了 ORDER BY 就从"全表求和"变成"逐行累加"。这是窗口函数和普通聚合最关键的区别。',
      },
      {
        label: '显式写 ROWS BETWEEN',
        sql: `SELECT name, salary, SUM(salary) OVER (ORDER BY salary DESC, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total FROM (SELECT e.id, e.name, e.salary FROM employees e JOIN departments d ON d.id = e.dept_id WHERE d.name = '研发部') t ORDER BY salary DESC, id LIMIT 20`,
        note: '和上面完全等价，只是把默认窗口写出来。默认规则是"从第一行到当前行"，但加了 ORDER BY 才会这么算，不写 ORDER BY 就是整表。',
      },
    ],
    followups: [
      '不写 ORDER BY 的 SUM() OVER () 和写了 ORDER BY 的有什么区别？',
      'ROWS 和 RANGE 在窗口范围上有什么区别？遇到并列值时结果会不同吗？',
      '想算"到当前行为止，累计值占总数的百分比"，SQL 怎么加？',
    ],
  },

  {
    id: 'win-06',
    module: '窗口函数',
    difficulty: 3,
    title: '薪资最高的 20 个人占了多少钱',
    schema: 'company',
    tags: ['累计占比', '帕累托', '窗口'],
    description:
      '按薪资从高到低排，逐行累加并算出"累计金额占全公司薪资总额的百分比"。这就是常说的二八分析（帕累托），看少数人占了多少资源。',
    requirements: ['输出 4 列：rn、name、salary、cum_pct', 'rn 是薪资降序排名，cum_pct 是累计占比（百分比，保留 2 位小数）', '只取前 20 名', '按 rn 升序'],
    expectedColumns: ['rn', 'name', 'salary', 'cum_pct'],
    reference: `SELECT rn, name, salary, ROUND(cum * 100 / total, 2) AS cum_pct
FROM (
  SELECT e.name, e.salary,
         ROW_NUMBER() OVER (ORDER BY e.salary DESC, e.id) AS rn,
         SUM(e.salary) OVER (ORDER BY e.salary DESC, e.id) AS cum,
         SUM(e.salary) OVER () AS total
  FROM employees e
) t
WHERE rn <= 20
ORDER BY rn`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '两个窗口：一个累加、一个总和',
        sql: `SELECT rn, name, salary, ROUND(cum * 100 / total, 2) AS cum_pct FROM (SELECT e.name, e.salary, ROW_NUMBER() OVER (ORDER BY e.salary DESC, e.id) AS rn, SUM(e.salary) OVER (ORDER BY e.salary DESC, e.id) AS cum, SUM(e.salary) OVER () AS total FROM employees e) t WHERE rn <= 20 ORDER BY rn`,
        note: '同一个 SELECT 里可以开多个窗口，各算各的。cum 带 ORDER BY 是累加，total 不带是整表总和，两个一除就是占比。',
      },
      {
        label: '用标量子查询取总额',
        sql: `SELECT rn, name, salary, ROUND(cum * 100 / (SELECT SUM(salary) FROM employees), 2) AS cum_pct FROM (SELECT e.name, e.salary, ROW_NUMBER() OVER (ORDER BY e.salary DESC, e.id) AS rn, SUM(e.salary) OVER (ORDER BY e.salary DESC, e.id) AS cum FROM employees e) t WHERE rn <= 20 ORDER BY rn`,
        note: '分母用标量子查询也能算对，而且只查一次。窗口版的好处是写法统一、不用混两种风格。',
      },
    ],
    followups: [
      '前 20 个人的累计占比是多少？这说明了什么？',
      '如果改成"薪资最低的 20 个人"，SQL 要改哪里？',
      '累计占比最后一定等于 100% 吗？为什么会差一点点？',
    ],
  },

  {
    id: 'win-07',
    module: '窗口函数',
    difficulty: 3,
    title: '和前一名、后一名差多少',
    schema: 'company',
    tags: ['LAG', 'LEAD', '偏移窗口'],
    description:
      '把全公司薪资从高到低排成一条队，每个人同时看两个数：比前一名少多少、比后一名多多少。LAG 取"前一行"，LEAD 取"后一行"。',
    requirements: ['输出 5 列：rn、name、salary、prev_salary、next_salary', 'rn 是薪资降序排名，prev_salary 是前一名的薪资，next_salary 是后一名的薪资', '只取 rn 1 到 20', '按 rn 升序'],
    expectedColumns: ['rn', 'name', 'salary', 'prev_salary', 'next_salary'],
    reference: `SELECT rn, name, salary, prev_salary, next_salary
FROM (
  SELECT e.name, e.salary,
         ROW_NUMBER() OVER (ORDER BY e.salary DESC, e.id) AS rn,
         LAG(e.salary)  OVER (ORDER BY e.salary DESC, e.id) AS prev_salary,
         LEAD(e.salary) OVER (ORDER BY e.salary DESC, e.id) AS next_salary
  FROM employees e
) t
WHERE rn <= 20
ORDER BY rn`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'LAG + LEAD',
        sql: `SELECT rn, name, salary, prev_salary, next_salary FROM (SELECT e.name, e.salary, ROW_NUMBER() OVER (ORDER BY e.salary DESC, e.id) AS rn, LAG(e.salary) OVER (ORDER BY e.salary DESC, e.id) AS prev_salary, LEAD(e.salary) OVER (ORDER BY e.salary DESC, e.id) AS next_salary FROM employees e) t WHERE rn <= 20 ORDER BY rn`,
        note: 'LAG 往前看一行，LEAD 往后看一行。第一名的 prev_salary 和最后一名的 next_salary 会是 NULL，这是正常的。',
      },
      {
        label: '用命名窗口 WINDOW w AS',
        sql: `SELECT rn, name, salary, prev_salary, next_salary FROM (SELECT e.name, e.salary, ROW_NUMBER() OVER w AS rn, LAG(e.salary) OVER w AS prev_salary, LEAD(e.salary) OVER w AS next_salary FROM employees e WINDOW w AS (ORDER BY e.salary DESC, e.id)) t WHERE rn <= 20 ORDER BY rn`,
        note: '三个函数用的是同一个窗口，可以把窗口定义抽出来起个名字（WINDOW w AS ...），省得重复写三遍 ORDER BY。窗口定义很长时这个写法优势明显。',
      },
    ],
    followups: [
      'LAG 和 LEAD 的第三个参数是干什么的？不写会怎样？',
      '第一行的 prev_salary 是 NULL，怎么把它显示成 0？',
      '如果薪资有并列，LAG 取到的"前一名"是并列中的哪一个？结果稳定吗？',
    ],
  },

  {
    id: 'win-08',
    module: '窗口函数',
    difficulty: 3,
    title: '每个人离部门第一差多少',
    schema: 'company',
    tags: ['FIRST_VALUE', 'PARTITION BY', '窗口'],
    description:
      '在每个部门内部，把薪资最高的那个人的薪资作为"部门天花板"，然后算出每个人离这个天花板还差多少。FIRST_VALUE 取窗口内第一行的值。',
    requirements: ['输出 5 列：dept_name、name、salary、top_salary、gap', 'top_salary 是本部门最高薪资，gap = top_salary - salary', '只保留部门内薪资排名前 5 的人', '按 dept_name 升序、salary 降序、id 升序'],
    expectedColumns: ['dept_name', 'name', 'salary', 'top_salary', 'gap'],
    reference: `SELECT dept_name, name, salary, top_salary, top_salary - salary AS gap
FROM (
  SELECT d.name AS dept_name, e.name, e.salary, e.id,
         FIRST_VALUE(e.salary) OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS top_salary,
         ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) t
WHERE rn <= 5
ORDER BY dept_name, salary DESC, id`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'FIRST_VALUE 取窗口第一行',
        sql: `SELECT dept_name, name, salary, top_salary, top_salary - salary AS gap FROM (SELECT d.name AS dept_name, e.name, e.salary, e.id, FIRST_VALUE(e.salary) OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS top_salary, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn FROM employees e JOIN departments d ON d.id = e.dept_id) t WHERE rn <= 5 ORDER BY dept_name, salary DESC, id`,
        note: 'FIRST_VALUE 拿的是"窗口框架里的第一行"。因为按薪资降序，第一行就是最高薪，所以每个人都能看到部门天花板。',
      },
      {
        label: 'MAX() OVER (PARTITION BY)',
        sql: `SELECT dept_name, name, salary, top_salary, top_salary - salary AS gap FROM (SELECT d.name AS dept_name, e.name, e.salary, e.id, MAX(e.salary) OVER (PARTITION BY e.dept_id) AS top_salary, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn FROM employees e JOIN departments d ON d.id = e.dept_id) t WHERE rn <= 5 ORDER BY dept_name, salary DESC, id`,
        note: '求最大值其实用 MAX() OVER 更直白，不受窗口框架影响。FIRST_VALUE 更适合"取第一行的某个值"，比如首个订单日期。',
      },
    ],
    followups: [
      'FIRST_VALUE 不加 ORDER BY 会取到哪一行？',
      'LAST_VALUE 为什么经常"用不对"？和默认窗口框架有什么关系？',
      '如果部门里有并列第一，top_salary 还是对的吗？',
    ],
  },

  {
    id: 'win-09',
    module: '窗口函数',
    difficulty: 2,
    title: '2024 年每月订单数的环比',
    schema: 'shop',
    tags: ['LAG', '环比'],
    description:
      '按月统计 2024 年的订单数，并算出每个月比上个月多了还是少了多少单。环比就是"这个月和上个月比"。',
    requirements: ['输出 4 列：month、orders、prev_orders、diff', 'month 为 YYYY-MM，只统计 2024 年', 'prev_orders 是上个月的订单数（1 月为 NULL），diff = orders - prev_orders', '按 month 升序'],
    expectedColumns: ['month', 'orders', 'prev_orders', 'diff'],
    reference: `WITH m AS (
  SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COUNT(*) AS orders
  FROM orders
  WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'
  GROUP BY ym
)
SELECT ym AS month, orders,
       LAG(orders) OVER (ORDER BY ym) AS prev_orders,
       orders - LAG(orders) OVER (ORDER BY ym) AS diff
FROM m
ORDER BY ym`,
    ordered: true,
    roundTo: null,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '先按月聚合，再用 LAG',
        sql: `WITH m AS (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COUNT(*) AS orders FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY ym) SELECT ym AS month, orders, LAG(orders) OVER (ORDER BY ym) AS prev_orders, orders - LAG(orders) OVER (ORDER BY ym) AS diff FROM m ORDER BY ym`,
        note: '必须先把 5 万行压成 12 行月度数据，再在 12 行上做 LAG。直接在明细行上 LAG 是没有意义的。',
      },
      {
        label: '用自连接取上个月',
        sql: `WITH m AS (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COUNT(*) AS orders FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY ym) SELECT a.ym AS month, a.orders, b.orders AS prev_orders, a.orders - b.orders AS diff FROM m a LEFT JOIN m b ON b.ym = DATE_FORMAT(DATE_SUB(CONCAT(a.ym, '-01'), INTERVAL 1 MONTH), '%Y-%m') ORDER BY a.ym`,
        note: '不用窗口函数也能做：把月份表自己连自己，条件写成"上个月"。能跑对，但月份不连续时容易漏。',
      },
    ],
    followups: [
      '如果某个月一单都没有，环比会算成什么？这种"缺月"该怎么处理？',
      '想算环比增长率（百分比）而不是差值，SQL 怎么改？',
      '为什么不能直接在 orders 明细上用 LAG 算环比？',
    ],
  },

  {
    id: 'win-10',
    module: '窗口函数',
    difficulty: 3,
    title: '月度成交额的同比',
    schema: 'shop',
    tags: ['LAG', '同比', '偏移量'],
    description:
      '同比是"今年这个月和去年这个月比"。数据跨了 2023–2025 三年，把每个月和它 12 个月前的同一个月份对比。',
    requirements: ['输出 4 列：month、gmv、last_year_gmv、yoy_pct', 'month 为 YYYY-MM，只统计 completed 订单', 'gmv 保留 2 位小数，last_year_gmv 是 12 个月前的成交额', 'yoy_pct = (gmv - last_year_gmv) / last_year_gmv * 100，保留 2 位小数', '按 month 升序'],
    expectedColumns: ['month', 'gmv', 'last_year_gmv', 'yoy_pct'],
    reference: `WITH m AS (
  SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, ROUND(SUM(total_amount), 2) AS gmv
  FROM orders
  WHERE status = 'completed'
  GROUP BY ym
)
SELECT ym AS month, gmv,
       LAG(gmv, 12) OVER (ORDER BY ym) AS last_year_gmv,
       ROUND((gmv - LAG(gmv, 12) OVER (ORDER BY ym)) * 100 / LAG(gmv, 12) OVER (ORDER BY ym), 2) AS yoy_pct
FROM m
ORDER BY ym`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'LAG(列, 12) 往前推 12 个月',
        sql: `WITH m AS (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'completed' GROUP BY ym) SELECT ym AS month, gmv, LAG(gmv, 12) OVER (ORDER BY ym) AS last_year_gmv, ROUND((gmv - LAG(gmv, 12) OVER (ORDER BY ym)) * 100 / LAG(gmv, 12) OVER (ORDER BY ym), 2) AS yoy_pct FROM m ORDER BY ym`,
        note: 'LAG 的第二个参数是"往前看几行"。月度数据里往前 12 行正好是去年同月，前提是月份连续、一个月不缺。',
      },
      {
        label: '按年月自连接',
        sql: `WITH m AS (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'completed' GROUP BY ym) SELECT a.ym AS month, a.gmv, b.gmv AS last_year_gmv, ROUND((a.gmv - b.gmv) * 100 / b.gmv, 2) AS yoy_pct FROM m a LEFT JOIN m b ON b.ym = DATE_FORMAT(DATE_SUB(CONCAT(a.ym, '-01'), INTERVAL 1 YEAR), '%Y-%m') ORDER BY a.ym`,
        note: '不依赖"行数偏移"，而是直接按"去年同月"这个业务含义连接。月份有缺失时这个写法比 LAG 更稳。',
      },
    ],
    followups: [
      '如果中间有一个月完全没有订单，LAG(gmv, 12) 还能对上去年同月吗？',
      '同比和环比的区别是什么？什么业务看同比更合适？',
      '前 12 个月的 yoy_pct 是 NULL，怎么把它过滤掉？',
    ],
  },

  {
    id: 'win-11',
    module: '窗口函数',
    difficulty: 3,
    title: '3 月每天的 7 日移动平均',
    schema: 'shop',
    tags: ['移动平均', 'ROWS BETWEEN'],
    description:
      '每天的成交额波动很大，看趋势要看"移动平均"：把当天和它前面 6 天加起来求平均，得到一条平滑的曲线。',
    requirements: ['输出 3 列：dt、amount、ma7', 'dt 为 2024-03 的每一天，amount 是当天 completed 订单成交额合计', 'ma7 = 当天及之前 6 天（共 7 天）的成交额平均值，保留 2 位小数', '按 dt 升序'],
    expectedColumns: ['dt', 'amount', 'ma7'],
    reference: `WITH d AS (
  SELECT DATE(order_date) AS dt, ROUND(SUM(total_amount), 2) AS amount
  FROM orders
  WHERE status = 'completed' AND order_date >= '2024-03-01' AND order_date < '2024-04-01'
  GROUP BY DATE(order_date)
)
SELECT dt, amount,
       ROUND(AVG(amount) OVER (ORDER BY dt ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS ma7
FROM d
ORDER BY dt`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'ROWS BETWEEN 6 PRECEDING',
        sql: `WITH d AS (SELECT DATE(order_date) AS dt, ROUND(SUM(total_amount), 2) AS amount FROM orders WHERE status = 'completed' AND order_date >= '2024-03-01' AND order_date < '2024-04-01' GROUP BY DATE(order_date)) SELECT dt, amount, ROUND(AVG(amount) OVER (ORDER BY dt ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS ma7 FROM d ORDER BY dt`,
        note: 'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW 的意思是"往前数 6 行到当前行"。月初几天没有 6 行可数，就按实际有的几行求平均。',
      },
      {
        label: 'RANGE 按日期范围',
        sql: `WITH d AS (SELECT DATE(order_date) AS dt, ROUND(SUM(total_amount), 2) AS amount FROM orders WHERE status = 'completed' AND order_date >= '2024-03-01' AND order_date < '2024-04-01' GROUP BY DATE(order_date)) SELECT dt, amount, ROUND(AVG(amount) OVER (ORDER BY dt RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW), 2) AS ma7 FROM d ORDER BY dt`,
        note: 'RANGE 按"值的范围"而不是"行数"。日期连续时两者结果一样；如果中间缺了几天，RANGE 才是对的，因为它算的是"往前 7 天"。',
      },
    ],
    followups: [
      'ROWS 和 RANGE 的差别在什么情况下才体现出来？',
      '月初前 6 天的 ma7 是怎么算的？这样合理吗？',
      '如果要算"7 天后的移动平均"（不含当天），窗口怎么写？',
    ],
  },

  {
    id: 'win-12',
    module: '窗口函数',
    difficulty: 2,
    title: '每个部门薪资占公司的比例',
    schema: 'company',
    tags: ['SUM OVER', '占比'],
    description:
      '先按部门汇总薪资总额，再算每个部门占全公司的百分比。分组之后还要"看见全局"，这就是窗口函数的用武之地。',
    requirements: ['输出 3 列：dept_name、total_salary、pct', 'total_salary 保留 2 位小数，pct 是占全公司薪资总额的百分比（保留 2 位小数）', '按 total_salary 降序、dept_name 升序'],
    expectedColumns: ['dept_name', 'total_salary', 'pct'],
    reference: `SELECT dept_name, total_salary, ROUND(total_salary * 100 / SUM(total_salary) OVER (), 2) AS pct
FROM (
  SELECT d.name AS dept_name, SUM(e.salary) AS total_salary
  FROM departments d
  JOIN employees e ON e.dept_id = d.id
  GROUP BY d.id, d.name
) t
ORDER BY total_salary DESC, dept_name`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'SUM() OVER () 做分母',
        sql: `SELECT dept_name, total_salary, ROUND(total_salary * 100 / SUM(total_salary) OVER (), 2) AS pct FROM (SELECT d.name AS dept_name, SUM(e.salary) AS total_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name) t ORDER BY total_salary DESC, dept_name`,
        note: 'SUM(total_salary) OVER () 不带 ORDER BY，等于"对全部 12 行求和"，正好当分母。写在同一个 SELECT 里，不用再查一次。',
      },
      {
        label: '标量子查询做分母',
        sql: `SELECT dept_name, total_salary, ROUND(total_salary * 100 / (SELECT SUM(salary) FROM employees WHERE dept_id IS NOT NULL), 2) AS pct FROM (SELECT d.name AS dept_name, SUM(e.salary) AS total_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name) t ORDER BY total_salary DESC, dept_name`,
        note: '也能算对。注意分母要加 dept_id IS NOT NULL，否则会把没部门的人也加进来，和分子的口径不一致。',
      },
    ],
    followups: [
      '分母不加 dept_id IS NOT NULL 会怎样？占比合计还是 100% 吗？',
      '如果把 SUM(...) OVER () 换成 SUM(...) OVER (ORDER BY total_salary)，结果会变成什么？',
      '想只显示占比超过 10% 的部门，为什么不能直接写在 WHERE 里？',
    ],
  },

  {
    id: 'win-13',
    module: '窗口函数',
    difficulty: 2,
    title: '每个商品占自己类目价格的比例',
    schema: 'shop',
    tags: ['PARTITION BY', '占比'],
    description:
      '同样是算占比，但这次分母是"本类目"而不是"全部"。PARTITION BY 就是用来把计算范围切到每个类目内部。',
    requirements: ['输出 4 列：category、name、price、pct', 'pct 是该商品价格占本类目所有商品价格合计的百分比（保留 2 位小数）', '按 category 升序、price 降序、id 升序', '取前 30 行'],
    expectedColumns: ['category', 'name', 'price', 'pct'],
    reference: `SELECT category, name, price, ROUND(price * 100 / SUM(price) OVER (PARTITION BY category), 2) AS pct
FROM products
ORDER BY category, price DESC, id
LIMIT 30`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'PARTITION BY 切分计算范围',
        sql: `SELECT category, name, price, ROUND(price * 100 / SUM(price) OVER (PARTITION BY category), 2) AS pct FROM products ORDER BY category, price DESC, id LIMIT 30`,
        note: 'PARTITION BY category 表示"每类各算各的分母"。和 GROUP BY 的区别是它不会把 500 个商品压成 8 行。',
      },
      {
        label: '先算类目总额再 JOIN',
        sql: `SELECT p.category, p.name, p.price, ROUND(p.price * 100 / t.cat_total, 2) AS pct FROM products p JOIN (SELECT category, SUM(price) AS cat_total FROM products GROUP BY category) t ON t.category = p.category ORDER BY p.category, p.price DESC, p.id LIMIT 30`,
        note: '不用窗口函数的做法：先把类目总额聚合成 8 行，再连回商品表。逻辑清楚，但要多写一层子查询。',
      },
    ],
    followups: [
      '把 PARTITION BY 去掉，pct 的含义会变成什么？',
      '同一类目内，这些 pct 加起来等于 100% 吗？',
      '如果要按"销售额"而不是"价格"算占比，SQL 要怎么改？',
    ],
  },

  {
    id: 'win-14',
    module: '窗口函数',
    difficulty: 3,
    title: '每个客户的首单和末单',
    schema: 'shop',
    tags: ['FIRST_VALUE', 'LAST_VALUE', '去重'],
    description:
      '每个客户可能下过很多单，现在要压缩成"一人一行"：首次下单日期和最近一次下单日期。这是做用户生命周期分析的第一步。',
    requirements: ['输出 3 列：customer_id、first_order、last_order', 'first_order 是该客户最早的下单时间，last_order 是最晚的下单时间', '每个客户只出现一行', '按 customer_id 升序，取前 30 行'],
    expectedColumns: ['customer_id', 'first_order', 'last_order'],
    reference: `SELECT DISTINCT customer_id,
       FIRST_VALUE(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, id) AS first_order,
       FIRST_VALUE(order_date) OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS last_order
FROM orders
ORDER BY customer_id
LIMIT 30`,
    ordered: true,
    roundTo: null,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '两个 FIRST_VALUE + DISTINCT',
        sql: `SELECT DISTINCT customer_id, FIRST_VALUE(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, id) AS first_order, FIRST_VALUE(order_date) OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS last_order FROM orders ORDER BY customer_id LIMIT 30`,
        note: '取"最后一个"时故意倒序再用 FIRST_VALUE，而不是用 LAST_VALUE——因为 LAST_VALUE 的默认窗口只到当前行，结果往往不是你以为的那个。',
      },
      {
        label: 'GROUP BY + MIN/MAX',
        sql: `SELECT customer_id, MIN(order_date) AS first_order, MAX(order_date) AS last_order FROM orders GROUP BY customer_id ORDER BY customer_id LIMIT 30`,
        note: '这题其实 MIN/MAX 就够了，而且更快。窗口函数的价值在于"同时要首单金额"这种场景——MIN 只能给日期，给不了日期那一行的其他字段。',
      },
    ],
    followups: [
      'LAST_VALUE 不加窗口框架为什么会算错？',
      '如果要同时输出首单的金额，MIN(order_date) 为什么不够用？',
      '一个客户下了 100 单，DISTINCT 会先算出 100 行再压缩，有没有更省的办法？',
    ],
  },

  {
    id: 'win-15',
    module: '窗口函数',
    difficulty: 4,
    title: '每个部门的薪资中位数',
    schema: 'company',
    tags: ['中位数', 'ROW_NUMBER', 'COUNT OVER'],
    description:
      'MySQL 没有现成的中位数函数，得自己算：把部门内的人排序编号，再取正中间那一行（偶数个时取中间两行的平均）。',
    requirements: ['输出 2 列：dept_name、median_salary', 'median_salary 保留 2 位小数，人数为偶数时取中间两人的平均', '只统计有部门的员工', '按 median_salary 降序、dept_name 升序'],
    expectedColumns: ['dept_name', 'median_salary'],
    reference: `WITH r AS (
  SELECT dept_id, salary,
         ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn,
         COUNT(*)     OVER (PARTITION BY dept_id) AS n
  FROM employees
  WHERE dept_id IS NOT NULL
)
SELECT d.name AS dept_name, ROUND(AVG(r.salary), 2) AS median_salary
FROM r
JOIN departments d ON d.id = r.dept_id
WHERE r.rn IN (FLOOR((r.n + 1) / 2), CEIL((r.n + 1) / 2))
GROUP BY d.id, d.name
ORDER BY median_salary DESC, dept_name`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '行号取中间 + AVG 合并',
        sql: `WITH r AS (SELECT dept_id, salary, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn, COUNT(*) OVER (PARTITION BY dept_id) AS n FROM employees WHERE dept_id IS NOT NULL) SELECT d.name AS dept_name, ROUND(AVG(r.salary), 2) AS median_salary FROM r JOIN departments d ON d.id = r.dept_id WHERE r.rn IN (FLOOR((r.n + 1) / 2), CEIL((r.n + 1) / 2)) GROUP BY d.id, d.name ORDER BY median_salary DESC, dept_name`,
        note: '人数是奇数时 FLOOR 和 CEIL 算出同一个位置，AVG 一行还是它自己；偶数时两个位置不同，AVG 自动变成两者的平均。一个写法覆盖两种情况。',
      },
      {
        label: '用 BETWEEN 取中间区间',
        sql: `WITH r AS (SELECT dept_id, salary, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn, COUNT(*) OVER (PARTITION BY dept_id) AS n FROM employees WHERE dept_id IS NOT NULL) SELECT d.name AS dept_name, ROUND(AVG(r.salary), 2) AS median_salary FROM r JOIN departments d ON d.id = r.dept_id WHERE r.rn BETWEEN FLOOR((r.n + 1) / 2) AND CEIL((r.n + 1) / 2) GROUP BY d.id, d.name ORDER BY median_salary DESC, dept_name`,
        note: 'IN 换成 BETWEEN，效果完全一样——因为两个位置要么是同一个数，要么正好相邻。BETWEEN 更容易看出"这是一个区间"的意图。',
      },
    ],
    followups: [
      '部门人数是偶数时，为什么要取两行求平均？',
      '中位数和平均薪资哪个更能反映"典型水平"？为什么？',
      '如果要求"每个部门薪资的 90 分位"，怎么改？',
    ],
  },

  {
    id: 'win-16',
    module: '窗口函数',
    difficulty: 2,
    title: '每个部门薪资最高的人是谁',
    schema: 'company',
    tags: ['ROW_NUMBER', '丢明细'],
    description:
      '这题看着和"每部门最高薪资"一样，但要求输出的是"人"，不是那个数字。GROUP BY + MAX 拿不到人名，这正是窗口函数存在的理由。',
    requirements: ['输出 3 列：dept_name、name、salary', '每个部门只保留薪资最高的一位（并列时取 id 最小的）', '按 dept_name 升序'],
    expectedColumns: ['dept_name', 'name', 'salary'],
    reference: `SELECT dept_name, name, salary
FROM (
  SELECT d.name AS dept_name, e.name, e.salary, e.id,
         ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) t
WHERE rn = 1
ORDER BY dept_name`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'ROW_NUMBER = 1',
        sql: `SELECT dept_name, name, salary FROM (SELECT d.name AS dept_name, e.name, e.salary, e.id, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC, e.id) AS rn FROM employees e JOIN departments d ON d.id = e.dept_id) t WHERE rn = 1 ORDER BY dept_name`,
        note: '先用窗口给每人编号，再只留 1 号。注意 ORDER BY 里有 id，并列时取 id 最小的那位，结果唯一。',
      },
      {
        label: '相关子查询取每人第一',
        sql: `SELECT d.name AS dept_name, e.name, e.salary FROM employees e JOIN departments d ON d.id = e.dept_id WHERE e.id = (SELECT e2.id FROM employees e2 WHERE e2.dept_id = d.id ORDER BY e2.salary DESC, e2.id LIMIT 1) ORDER BY dept_name`,
        note: '子查询里排序取 1 条，天然保证"每部门一个人"。12 个部门就执行 12 次，比窗口函数扫全表还快。部门数量上千时就该换回窗口版了。',
      },
    ],
    followups: [
      '为什么 SELECT name, MAX(salary) FROM employees GROUP BY dept_id 在 MySQL 里可能"看起来能跑"？它真的对了吗？',
      '如果要"并列的都返回"，该用哪个函数？',
      '如果同时要"最高薪的人"和"最低薪的人"，怎么用一条 SQL 出来？',
    ],
  },

  {
    id: 'win-17',
    module: '窗口函数',
    difficulty: 3,
    title: '成绩和课程平均分差多少',
    schema: 'school',
    tags: ['AVG OVER', 'PARTITION BY', '对比'],
    description:
      '每条成绩记录旁边，都显示"这门课的平均分"和"我比平均高/低多少"。难点是要保留每一行明细，同时看到所在课程的整体水平。',
    requirements: ['输出 5 列：course_name、student_name、score、avg_score、diff', 'avg_score 是本课程所有有效成绩的平均分（保留 2 位小数），diff = score - avg_score（保留 2 位小数）', '只统计有成绩的记录（排除缺考）', '按 course_name 升序、diff 降序、student_id 升序', '取前 30 行'],
    expectedColumns: ['course_name', 'student_name', 'score', 'avg_score', 'diff'],
    reference: `SELECT course_name, student_name, score, avg_score, ROUND(score - avg_score, 2) AS diff
FROM (
  SELECT c.name AS course_name, st.name AS student_name, sc.score, sc.student_id,
         ROUND(AVG(sc.score) OVER (PARTITION BY sc.course_id), 2) AS avg_score
  FROM scores sc
  JOIN courses c ON c.id = sc.course_id
  JOIN students st ON st.id = sc.student_id
  WHERE sc.score IS NOT NULL
) t
ORDER BY course_name, diff DESC, student_id
LIMIT 30`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'AVG() OVER (PARTITION BY)',
        sql: `SELECT course_name, student_name, score, avg_score, ROUND(score - avg_score, 2) AS diff FROM (SELECT c.name AS course_name, st.name AS student_name, sc.score, sc.student_id, ROUND(AVG(sc.score) OVER (PARTITION BY sc.course_id), 2) AS avg_score FROM scores sc JOIN courses c ON c.id = sc.course_id JOIN students st ON st.id = sc.student_id WHERE sc.score IS NOT NULL) t ORDER BY course_name, diff DESC, student_id LIMIT 30`,
        note: 'AVG 加 OVER 之后，每一行都会带上"本课程平均分"，明细一行不少。这是 GROUP BY 做不到的。',
      },
      {
        label: '先聚合再 JOIN 回去',
        sql: `SELECT c.name AS course_name, st.name AS student_name, sc.score, a.avg_score, ROUND(sc.score - a.avg_score, 2) AS diff FROM scores sc JOIN courses c ON c.id = sc.course_id JOIN students st ON st.id = sc.student_id JOIN (SELECT course_id, ROUND(AVG(score), 2) AS avg_score FROM scores WHERE score IS NOT NULL GROUP BY course_id) a ON a.course_id = sc.course_id WHERE sc.score IS NOT NULL ORDER BY course_name, diff DESC, sc.student_id LIMIT 30`,
        note: '不用窗口函数：先算 60 门课的平均分，再连回 2 万行成绩。逻辑等价，但要多扫一遍表。',
      },
    ],
    followups: [
      'AVG() OVER 和子查询里的 AVG 在性能上有什么区别？',
      '为什么 WHERE 里要先排除 score IS NULL？如果不过滤，平均分会变吗？',
      '想按"高于课程平均分的人数比例"排课程，怎么改？',
    ],
  },

  {
    id: 'win-18',
    module: '窗口函数',
    difficulty: 2,
    title: '每个学生最好的一门课',
    schema: 'school',
    tags: ['ROW_NUMBER', '分组取 Top1'],
    description: '每个学生可能选了好几门课，找出分数最高的那一门。分数相同时取课程号小的。',
    requirements: ['输出 4 列：student_id、student_name、course_name、score', '每个学生一行，取分数最高的一门（并列取课程号小的）', '按 student_id 升序，取前 30 行'],
    expectedColumns: ['student_id', 'student_name', 'course_name', 'score'],
    reference: `SELECT student_id, student_name, course_name, score
FROM (
  SELECT sc.student_id, st.name AS student_name, c.name AS course_name, sc.score,
         ROW_NUMBER() OVER (PARTITION BY sc.student_id ORDER BY sc.score DESC, sc.course_id) AS rn
  FROM scores sc
  JOIN students st ON st.id = sc.student_id
  JOIN courses c ON c.id = sc.course_id
  WHERE sc.score IS NOT NULL
) t
WHERE rn = 1
ORDER BY student_id
LIMIT 30`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'ROW_NUMBER 取每组第一',
        sql: `SELECT student_id, student_name, course_name, score FROM (SELECT sc.student_id, st.name AS student_name, c.name AS course_name, sc.score, ROW_NUMBER() OVER (PARTITION BY sc.student_id ORDER BY sc.score DESC, sc.course_id) AS rn FROM scores sc JOIN students st ON st.id = sc.student_id JOIN courses c ON c.id = sc.course_id WHERE sc.score IS NOT NULL) t WHERE rn = 1 ORDER BY student_id LIMIT 30`,
        note: '"分组取 Top1"是所有窗口函数题里最高频的模板：PARTITION BY 分组、ORDER BY 排名、外层筛 rn=1。',
      },
      {
        label: '用相关子查询取最大值',
        sql: `SELECT sc.student_id, st.name AS student_name, c.name AS course_name, sc.score FROM scores sc JOIN students st ON st.id = sc.student_id JOIN courses c ON c.id = sc.course_id WHERE sc.score = (SELECT MAX(sc2.score) FROM scores sc2 WHERE sc2.student_id = sc.student_id) ORDER BY sc.student_id, sc.course_id LIMIT 30`,
        note: '注意这个写法的隐患：如果一个学生有两门课同分，两门都会被选出来，就不满足"每个学生一行"了。',
      },
    ],
    followups: [
      '上面第二种写法在什么情况下会返回多行？',
      '如果要取"每个学生最好的两门课"，怎么改？',
      'ROW_NUMBER 和 RANK 在这里结果会不同吗？什么情况下不同？',
    ],
  },

  {
    id: 'win-19',
    module: '窗口函数',
    difficulty: 3,
    title: '同一个客户相邻两单隔了多久',
    schema: 'shop',
    tags: ['LAG', 'DATEDIFF', '分区'],
    description:
      '把每个客户的订单按时间排好，算这一单和上一单之间隔了几天。这是复购分析里最基础的指标，靠 LAG 取上一行的日期。',
    requirements: ['输出 5 列：customer_id、order_id、order_date、prev_date、gap_days', 'prev_date 是该客户上一单的下单时间，gap_days = DATEDIFF(order_date, prev_date)', '只保留有上一单的记录', '按 customer_id 升序、order_date 升序、order_id 升序', '取前 30 行'],
    expectedColumns: ['customer_id', 'order_id', 'order_date', 'prev_date', 'gap_days'],
    reference: `SELECT customer_id, order_id, order_date, prev_date, DATEDIFF(order_date, prev_date) AS gap_days
FROM (
  SELECT o.customer_id, o.id AS order_id, o.order_date,
         LAG(o.order_date) OVER (PARTITION BY o.customer_id ORDER BY o.order_date, o.id) AS prev_date
  FROM orders o
) t
WHERE prev_date IS NOT NULL
ORDER BY customer_id, order_date, order_id
LIMIT 30`,
    ordered: true,
    roundTo: null,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'LAG 取上一单日期',
        sql: `SELECT customer_id, order_id, order_date, prev_date, DATEDIFF(order_date, prev_date) AS gap_days FROM (SELECT o.customer_id, o.id AS order_id, o.order_date, LAG(o.order_date) OVER (PARTITION BY o.customer_id ORDER BY o.order_date, o.id) AS prev_date FROM orders o) t WHERE prev_date IS NOT NULL ORDER BY customer_id, order_date, order_id LIMIT 30`,
        note: 'PARTITION BY customer_id 保证"上一行"是同一个客户的上一个订单，不会串到别人头上。ORDER BY 里加 id 是为了处理同一时刻下的多单。',
      },
      {
        label: '自连接取上一单',
        sql: `SELECT o.customer_id, o.id AS order_id, o.order_date, p.order_date AS prev_date, DATEDIFF(o.order_date, p.order_date) AS gap_days FROM orders o JOIN orders p ON p.customer_id = o.customer_id AND (p.order_date < o.order_date OR (p.order_date = o.order_date AND p.id < o.id)) WHERE p.id = (SELECT p2.id FROM orders p2 WHERE p2.customer_id = o.customer_id AND (p2.order_date < o.order_date OR (p2.order_date = o.order_date AND p2.id < o.id)) ORDER BY p2.order_date DESC, p2.id DESC LIMIT 1) ORDER BY customer_id, order_date, order_id LIMIT 30`,
        note: '不用窗口函数就得自己找"上一条"：先关联出所有更早的单，再取其中最新的一条。能跑通，但写法复杂且慢。',
      },
    ],
    followups: [
      '如果客户只有一单，gap_days 会是什么？为什么被过滤掉了？',
      '想算"每个客户的平均复购间隔"，怎么在这个结果上继续？',
      'LAG 的 ORDER BY 只写 order_date、不加 id，会有什么风险？',
    ],
  },

  {
    id: 'cmp-win-01',
    module: '窗口函数',
    difficulty: 3,
    title: '每个部门薪资前 2 名',
    schema: 'company',
    tags: ['窗口函数', 'DENSE_RANK', 'PARTITION BY'],
    description:
      '列出每个部门薪资排名前 2 的员工。关键点：同一薪资并列时共享同一名次，并列的人都要返回（也就是说一个部门可能返回超过 2 个人）。',
    requirements: [
      '必须使用窗口函数（OVER 子句）',
      '输出 4 列：部门名 dept_name、员工名 name、薪资 salary、部门内排名 rk',
      '排名用 DENSE_RANK（并列共享名次，且名次不跳号）',
      '按 dept_name、rk、name 升序排列',
    ],
    expectedColumns: ['dept_name', 'name', 'salary', 'rk'],
    reference: `SELECT t.dept_name, t.name, t.salary, t.rk
FROM (
  SELECT d.name AS dept_name, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) t
WHERE t.rk <= 2
ORDER BY t.dept_name, t.rk, t.name`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'DENSE_RANK + 子查询过滤（标准解法）',
        sql: `SELECT t.dept_name, t.name, t.salary, t.rk
FROM (
  SELECT d.name AS dept_name, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) t
WHERE t.rk <= 2
ORDER BY t.dept_name, t.rk, t.name`,
        note: '窗口函数不能直接写在 WHERE 里（WHERE 比窗口函数先执行），必须套一层子查询或 CTE 再过滤。',
      },
      {
        label: 'CTE 写法（可读性更好）',
        sql: `WITH ranked AS (
  SELECT d.name AS dept_name, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
)
SELECT dept_name, name, salary, rk
FROM ranked
WHERE rk <= 2
ORDER BY dept_name, rk, name`,
        note: '逻辑完全一样。CTE 的好处是拆成两步，读起来更像自然语言，面试时也更容易讲清楚思路。',
      },
      {
        label: '自连接（不用窗口函数的老写法）',
        sql: `SELECT d.name AS dept_name, e.name, e.salary,
       (SELECT COUNT(DISTINCT e2.salary) FROM employees e2
        WHERE e2.dept_id = e.dept_id AND e2.salary > e.salary) + 1 AS rk
FROM employees e
JOIN departments d ON d.id = e.dept_id
HAVING rk <= 2
ORDER BY dept_name, rk, name`,
        note: '相关子查询数「比我工资高的人数」+1 就是名次。能用，但每个员工都要扫一遍同部门，复杂度 O(n²)，实测 3 秒以上——面试里说出来能体现你懂原理。',
      },
    ],
    followups: [
      'RANK、DENSE_RANK、ROW_NUMBER 三者的区别？如果题目改成「每部门取 2 个人」该用哪个？',
      '为什么窗口函数不能写在 WHERE 里？MySQL 的执行顺序是怎样的？',
      '如果要求「取薪资前 2 名且不并列」，SQL 该怎么改？',
    ],
  },
];
