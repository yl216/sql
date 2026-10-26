// 模块 3：JOIN 与反连接
export const JOINS = [
  {
    id: 'join-01',
    module: 'JOIN 与反连接',
    difficulty: 1,
    title: '员工及其所属部门名',
    schema: 'company',
    tags: ['INNER JOIN'],
    description: '员工表里只存了 dept_id，要拿到部门名必须关联部门表。最基础的两表连接。',
    requirements: ['输出 3 列：id、name、dept_name', '只保留有部门的员工', '按 id 升序，取前 30 行'],
    expectedColumns: ['id', 'name', 'dept_name'],
    reference: `SELECT e.id, e.name, d.name AS dept_name
FROM employees e
JOIN departments d ON d.id = e.dept_id
ORDER BY e.id
LIMIT 30`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'INNER JOIN ... ON',
        sql: `SELECT e.id, e.name, d.name AS dept_name FROM employees e JOIN departments d ON d.id = e.dept_id ORDER BY e.id LIMIT 30`,
        note: 'ON 里写关联条件，两边都能走索引。INNER JOIN 只保留能匹配上的行，所以 119 位无部门员工被过滤掉了。',
      },
      {
        label: '逗号连接 + WHERE',
        sql: `SELECT e.id, e.name, d.name AS dept_name FROM employees e, departments d WHERE e.dept_id = d.id ORDER BY e.id LIMIT 30`,
        note: '老式写法，效果等同 INNER JOIN。缺点是一旦漏写 WHERE 就变成笛卡尔积，而且关联条件和过滤条件混在一起不好读。',
      },
    ],
    followups: [
      '这条查询结果有多少行？为什么不是 5000 行？',
      '如果把 JOIN 换成 LEFT JOIN，结果会多出哪些行？',
      'ON 和 WHERE 在 INNER JOIN 里可以互换吗？LEFT JOIN 里呢？',
    ],
  },

  {
    id: 'join-02',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '员工和他的直属上级',
    schema: 'company',
    tags: ['自连接'],
    description: 'employees 表里 manager_id 指向同一张表的 id。要同时显示员工和上级的姓名，得把这张表用两次。',
    requirements: ['输出 3 列：id、name、manager_name', '只保留有上级的员工', '按 id 升序，取前 30 行'],
    expectedColumns: ['id', 'name', 'manager_name'],
    reference: `SELECT e.id, e.name, m.name AS manager_name
FROM employees e
JOIN employees m ON m.id = e.manager_id
ORDER BY e.id
LIMIT 30`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '自连接 + 两个别名',
        sql: `SELECT e.id, e.name, m.name AS manager_name FROM employees e JOIN employees m ON m.id = e.manager_id ORDER BY e.id LIMIT 30`,
        note: '同一张表出现两次必须给不同别名，否则列名无法区分。这里 e 是员工视角，m 是上级视角。',
      },
      {
        label: '标量子查询',
        sql: `SELECT e.id, e.name, (SELECT m.name FROM employees m WHERE m.id = e.manager_id) AS manager_name FROM employees e WHERE e.manager_id IS NOT NULL ORDER BY e.id LIMIT 30`,
        note: '每一行都去子查询里捞一次上级姓名。结果一样，但行数多时比 JOIN 慢很多——这是"相关子查询"的典型代价。',
      },
    ],
    followups: [
      '这条查询返回多少行？和"没有上级的员工数"加起来是 5000 吗？',
      '如果想连"没有上级的员工"也显示（上级列为 NULL），SQL 怎么改？',
      '如果要查"上级的上级"（两级），怎么写？层级不确定时又该怎么写？',
    ],
  },

  {
    id: 'join-03',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '一单都没下过的客户',
    schema: 'shop',
    tags: ['反连接', 'LEFT JOIN', 'NOT EXISTS'],
    description: '有 23 位客户注册后从没下过单。反连接是面试高频题：找出"在 A 表但不在 B 表"的记录。',
    requirements: ['输出 2 列：id、name', '只保留没有任何订单的客户', '按 id 升序'],
    expectedColumns: ['id', 'name'],
    reference: `SELECT c.id, c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL
ORDER BY c.id`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN + IS NULL',
        sql: `SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.id`,
        note: '左连接后没有匹配的行，右表所有列都是 NULL。判断要用右表的主键（o.id），用左表列永远不成立。',
      },
      {
        label: 'NOT EXISTS（推荐）',
        sql: `SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) ORDER BY c.id`,
        note: '语义最清楚，不受 NULL 影响。MySQL 8 会把它优化成 anti-join，性能通常不比 LEFT JOIN 差。',
      },
      {
        label: 'NOT IN',
        sql: `SELECT c.id, c.name FROM customers c WHERE c.id NOT IN (SELECT customer_id FROM orders) ORDER BY c.id`,
        note: '这题能跑对，因为 orders.customer_id 是 NOT NULL。一旦子查询结果里可能出现 NULL，NOT IN 会让整个条件变成 UNKNOWN，直接返回空集。',
      },
    ],
    followups: [
      'WHERE o.id IS NULL 和 WHERE c.id IS NULL 有什么区别？',
      '如果子查询里有 NULL，NOT IN 为什么返回空集？',
      'LEFT JOIN 反连接和 NOT EXISTS 的执行计划分别长什么样？',
    ],
  },

  {
    id: 'join-04',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '每个员工参与了几个项目',
    schema: 'company',
    tags: ['LEFT JOIN', 'COUNT', 'GROUP BY'],
    description: '不是所有员工都有项目。统计每位员工参与的项目数，没有项目的要显示 0，而不是被漏掉。',
    requirements: ['输出 3 列：id、name、projects', 'projects 是参与的项目数，没有项目记 0', '按 projects 降序，相同则按 id 升序', '取前 20 行'],
    expectedColumns: ['id', 'name', 'projects'],
    reference: `SELECT e.id, e.name, COUNT(ep.project_id) AS projects
FROM employees e
LEFT JOIN employee_projects ep ON ep.employee_id = e.id
GROUP BY e.id, e.name
ORDER BY projects DESC, e.id
LIMIT 20`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN + COUNT(右表列)',
        sql: `SELECT e.id, e.name, COUNT(ep.project_id) AS projects FROM employees e LEFT JOIN employee_projects ep ON ep.employee_id = e.id GROUP BY e.id, e.name ORDER BY projects DESC, e.id LIMIT 20`,
        note: '数右表的列，没匹配上时是 NULL，COUNT 跳过 NULL 得到 0。',
      },
      {
        label: '先聚合再 LEFT JOIN',
        sql: `SELECT e.id, e.name, COALESCE(t.projects, 0) AS projects FROM employees e LEFT JOIN (SELECT employee_id, COUNT(*) AS projects FROM employee_projects GROUP BY employee_id) t ON t.employee_id = e.id ORDER BY projects DESC, e.id LIMIT 20`,
        note: '先把 1.2 万行关系聚合成几千行，再和 5 千员工关联。数据量大时通常比直接 GROUP BY 更快。',
      },
    ],
    followups: [
      '如果把 COUNT(ep.project_id) 换成 COUNT(*)，没有项目的员工会显示几？',
      '想同时看"参与项目数"和"总工时"，怎么改？',
      '想取项目数最多的前 10% 员工，怎么写？',
    ],
  },

  {
    id: 'join-05',
    module: 'JOIN 与反连接',
    difficulty: 1,
    title: '订单明细里的商品信息',
    schema: 'shop',
    tags: ['INNER JOIN', '多表'],
    description: '订单明细只存了 product_id，要看商品名和类目得关联商品表。取前 50 个订单的所有明细。',
    requirements: ['输出 5 列：order_id、product_name、category、qty、unit_price', '只取 order_id <= 50 的明细', '按 order_id 升序，同一订单内按明细 id 升序'],
    expectedColumns: ['order_id', 'product_name', 'category', 'qty', 'unit_price'],
    reference: `SELECT oi.order_id, p.name AS product_name, p.category, oi.qty, oi.unit_price
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id <= 50
ORDER BY oi.order_id, oi.id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '两表 JOIN + WHERE 过滤',
        sql: `SELECT oi.order_id, p.name AS product_name, p.category, oi.qty, oi.unit_price FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id <= 50 ORDER BY oi.order_id, oi.id`,
        note: '过滤条件写在 WHERE 里。因为两张表都是 INNER JOIN，写在 WHERE 还是 ON 里结果一样。',
      },
      {
        label: '过滤条件写在 ON 里',
        sql: `SELECT oi.order_id, p.name AS product_name, p.category, oi.qty, oi.unit_price FROM order_items oi JOIN products p ON p.id = oi.product_id AND oi.order_id <= 50 ORDER BY oi.order_id, oi.id`,
        note: 'INNER JOIN 下等价。但换成 LEFT JOIN 就完全不同了：写在 ON 里只影响"能不能匹配上"，写在 WHERE 里会过滤掉整行。',
      },
    ],
    followups: [
      'LEFT JOIN 时，把过滤条件放在 ON 和 WHERE 里结果有什么不同？',
      '为什么这里要按 oi.order_id 和 oi.id 排序？只按 order_id 排会怎样？',
      '如果要连订单表一起取订单日期，SQL 怎么加？加完会不会出现重复行？',
    ],
  },

  {
    id: 'join-06',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '每笔订单的件数与金额',
    schema: 'shop',
    tags: ['GROUP BY', 'SUM', '多表聚合'],
    description: '把订单明细按订单聚合：一共几行明细、几件商品、合计多少钱。取前 100 个订单。',
    requirements: ['输出 4 列：id、items、units、amount', 'items 是明细行数，units 是件数总和，amount = SUM(qty * unit_price) 保留 2 位小数', '只取 order_id <= 100 的订单', '按 id 升序'],
    expectedColumns: ['id', 'items', 'units', 'amount'],
    reference: `SELECT o.id,
       COUNT(oi.id) AS items,
       SUM(oi.qty) AS units,
       ROUND(SUM(oi.qty * oi.unit_price), 2) AS amount
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.id <= 100
GROUP BY o.id
ORDER BY o.id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'JOIN 后聚合',
        sql: `SELECT o.id, COUNT(oi.id) AS items, SUM(oi.qty) AS units, ROUND(SUM(oi.qty * oi.unit_price), 2) AS amount FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.id <= 100 GROUP BY o.id ORDER BY o.id`,
        note: '最直接的写法。注意金额是用明细重新算的，没有直接用 orders.total_amount。',
      },
      {
        label: '从明细表出发',
        sql: `SELECT oi.order_id AS id, COUNT(*) AS items, SUM(oi.qty) AS units, ROUND(SUM(oi.qty * oi.unit_price), 2) AS amount FROM order_items oi WHERE oi.order_id <= 100 GROUP BY oi.order_id ORDER BY id`,
        note: '既然只需要订单号，订单表其实可以不用 JOIN。少一次关联，执行计划更简单。',
      },
    ],
    followups: [
      '算出来的 amount 和 orders.total_amount 一致吗？如果不一致说明什么？',
      '如果要包含"没有任何明细的订单"（显示 0 件），SQL 怎么改？',
      'items 和 units 有什么区别？为什么两个都要算？',
    ],
  },

  {
    id: 'join-07',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '平均分最高的 20 名学生',
    schema: 'school',
    tags: ['JOIN', 'AVG', 'NULL'],
    description: '学生表关联成绩表，算每个学生的选课数和平均分，取平均分最高的 20 位。注意缺考记录是 NULL，不参与平均分。',
    requirements: ['输出 4 列：id、name、courses、avg_score', 'courses 是选课数（含缺考），avg_score 保留 2 位小数', '按 avg_score 降序，相同则按 id 升序', '取前 20 行'],
    expectedColumns: ['id', 'name', 'courses', 'avg_score'],
    reference: `SELECT st.id, st.name,
       COUNT(sc.course_id) AS courses,
       ROUND(AVG(sc.score), 2) AS avg_score
FROM students st
JOIN scores sc ON sc.student_id = st.id
GROUP BY st.id, st.name
ORDER BY avg_score DESC, st.id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'JOIN + GROUP BY',
        sql: `SELECT st.id, st.name, COUNT(sc.course_id) AS courses, ROUND(AVG(sc.score), 2) AS avg_score FROM students st JOIN scores sc ON sc.student_id = st.id GROUP BY st.id, st.name ORDER BY avg_score DESC, st.id LIMIT 20`,
        note: 'courses 用 COUNT(sc.course_id) 数的是选课数，缺考也算一门——因为 course_id 不为 NULL，只有 score 是 NULL。',
      },
      {
        label: '从成绩表出发',
        sql: `SELECT sc.student_id AS id, (SELECT st.name FROM students st WHERE st.id = sc.student_id) AS name, COUNT(*) AS courses, ROUND(AVG(sc.score), 2) AS avg_score FROM scores sc GROUP BY sc.student_id ORDER BY avg_score DESC, id LIMIT 20`,
        note: '以成绩表为主表聚合，再回查姓名。思路一样，但 SELECT 里的标量子查询会让写法显得别扭，不如 JOIN 清楚。',
      },
    ],
    followups: [
      '如果某学生全部缺考，AVG 返回什么？他还会出现在排名里吗？',
      '想按"有成绩的科目数"排序而不是按平均分，怎么改？',
      '只选了一门课但考了满分的学生排第一，这合理吗？业务上怎么避免？',
    ],
  },

  {
    id: 'join-08',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '没有直属上级的员工',
    schema: 'company',
    tags: ['LEFT JOIN', '反连接', '自连接'],
    description: 'manager_id 为空的员工就是没有上级的人（通常是总监或技术专家层级）。用反连接的思路把他们找出来。',
    requirements: ['输出 3 列：id、name、title', '只保留没有直属上级的员工', '按 id 升序，取前 20 行'],
    expectedColumns: ['id', 'name', 'title'],
    reference: `SELECT e.id, e.name, e.title
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
WHERE m.id IS NULL
ORDER BY e.id
LIMIT 20`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '自连接反连接',
        sql: `SELECT e.id, e.name, e.title FROM employees e LEFT JOIN employees m ON m.id = e.manager_id WHERE m.id IS NULL ORDER BY e.id LIMIT 20`,
        note: '和 join-02 正好互补：那边查有上级的，这边查没上级的。',
      },
      {
        label: '直接判空',
        sql: `SELECT id, name, title FROM employees WHERE manager_id IS NULL ORDER BY id LIMIT 20`,
        note: '这题直接判空最简单。但如果数据里存在"manager_id 指向一个不存在的 id"的脏数据，两种写法结果就不一样了——自连接版会把这种人也算进来。',
      },
    ],
    followups: [
      'manager_id IS NULL 和 m.id IS NULL 在什么情况下结果不同？',
      '如果数据里存在 manager_id 指向已删除员工的情况，怎么排查？',
      '怎么查出"上级的上级也不存在"的员工？',
    ],
  },

  {
    id: 'join-09',
    module: 'JOIN 与反连接',
    difficulty: 3,
    title: '薪资高于本部门平均的人',
    schema: 'company',
    tags: ['派生表', '相关子查询', 'JOIN'],
    description: '把每个部门的平均薪资先算出来，再和员工表关联，找出高于本部门平均的人。不能直接在 WHERE 里写 AVG。',
    requirements: ['输出 4 列：id、name、dept_name、salary', '只保留薪资严格高于本部门平均的员工', '按 id 升序，取前 30 行'],
    expectedColumns: ['id', 'name', 'dept_name', 'salary'],
    reference: `SELECT e.id, e.name, d.name AS dept_name, e.salary
FROM employees e
JOIN departments d ON d.id = e.dept_id
JOIN (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM employees
  WHERE dept_id IS NOT NULL
  GROUP BY dept_id
) t ON t.dept_id = e.dept_id
WHERE e.salary > t.avg_salary
ORDER BY e.id
LIMIT 30`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '派生表先聚合再 JOIN（推荐）',
        sql: `SELECT e.id, e.name, d.name AS dept_name, e.salary FROM employees e JOIN departments d ON d.id = e.dept_id JOIN (SELECT dept_id, AVG(salary) AS avg_salary FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id) t ON t.dept_id = e.dept_id WHERE e.salary > t.avg_salary ORDER BY e.id LIMIT 30`,
        note: '部门均值只算一次（12 行），再和 5 千员工关联。这是数据量大时唯一靠谱的写法。',
      },
      {
        label: '相关子查询',
        sql: `SELECT e.id, e.name, d.name AS dept_name, e.salary FROM employees e JOIN departments d ON d.id = e.dept_id WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id) ORDER BY e.id LIMIT 30`,
        note: '每行都要重算一次本部门均值，5 千行就是 5 千次聚合。部门少的时候勉强能用，但和派生表版差一个数量级。',
      },
    ],
    followups: [
      '为什么不能写成 WHERE salary > AVG(salary)？',
      '两种写法的执行计划差在哪？数据量翻十倍会怎样？',
      '如果要找"薪资排在本部门前 30%"的人，哪种写法更合适？',
    ],
  },

  {
    id: 'join-10',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '上级薪资比下属高多少',
    schema: 'company',
    tags: ['自连接', '计算列'],
    description: '把员工和上级关联起来，算出上级比下属多拿多少。只保留上级确实更高的那些。',
    requirements: ['输出 5 列：id、name、salary、manager_name、gap', 'gap = 上级薪资 - 本人薪资', '只保留 gap > 0 的记录', '按 gap 降序，相同则按 id 升序', '取前 20 行'],
    expectedColumns: ['id', 'name', 'salary', 'manager_name', 'gap'],
    reference: `SELECT e.id, e.name, e.salary, m.name AS manager_name, m.salary - e.salary AS gap
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE m.salary > e.salary
ORDER BY gap DESC, e.id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '自连接 + 计算列',
        sql: `SELECT e.id, e.name, e.salary, m.name AS manager_name, m.salary - e.salary AS gap FROM employees e JOIN employees m ON m.id = e.manager_id WHERE m.salary > e.salary ORDER BY gap DESC, e.id LIMIT 20`,
        note: '同一张表两个别名，一个当下属一个当上级，各自取自己的列做减法。',
      },
      {
        label: '把过滤写进 ON',
        sql: `SELECT e.id, e.name, e.salary, m.name AS manager_name, m.salary - e.salary AS gap FROM employees e JOIN employees m ON m.id = e.manager_id AND m.salary > e.salary ORDER BY gap DESC, e.id LIMIT 20`,
        note: 'INNER JOIN 下等价，省一层 WHERE。条件变多时，把关联条件和过滤条件分开写通常更易读。',
      },
    ],
    followups: [
      '有没有可能出现"下属薪资高于上级"？查出这类记录能说明什么？',
      '如果要查"上级薪资是下属的 2 倍以上"，怎么写？',
      '如果层级有 3 层以上，怎么一次性算出每个人的层级深度？',
    ],
  },

  {
    id: 'join-11',
    module: 'JOIN 与反连接',
    difficulty: 3,
    title: '同名但在不同部门的员工',
    schema: 'company',
    tags: ['自连接', '去重', 'a.id < b.id'],
    description: '找重名是数据清洗的常见需求。这里要求更细：两个人同名，而且分属不同部门。注意同一对组合只能出现一次。',
    requirements: ['输出 3 列：id1、name、id2', 'id1 < id2，同一对只出现一次', '两人都必须有部门，且部门不同', '按 name、id1、id2 升序', '取前 20 行'],
    expectedColumns: ['id1', 'name', 'id2'],
    reference: `SELECT a.id AS id1, a.name, b.id AS id2
FROM employees a
JOIN employees b
  ON a.name = b.name
 AND a.id < b.id
 AND a.dept_id IS NOT NULL
 AND b.dept_id IS NOT NULL
 AND a.dept_id <> b.dept_id
ORDER BY a.name, a.id, b.id
LIMIT 20`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '自连接 + a.id < b.id',
        sql: `SELECT a.id AS id1, a.name, b.id AS id2 FROM employees a JOIN employees b ON a.name = b.name AND a.id < b.id AND a.dept_id IS NOT NULL AND b.dept_id IS NOT NULL AND a.dept_id <> b.dept_id ORDER BY a.name, a.id, b.id LIMIT 20`,
        note: 'a.id < b.id 既避免了自我配对，又保证 (1,2) 和 (2,1) 只出现一次。这是自连接去重的关键技巧。',
      },
      {
        label: '先找重名再展开',
        sql: `SELECT a.id AS id1, a.name, b.id AS id2 FROM (SELECT name FROM employees WHERE dept_id IS NOT NULL GROUP BY name HAVING COUNT(DISTINCT dept_id) > 1) dup JOIN employees a ON a.name = dup.name JOIN employees b ON b.name = dup.name AND a.id < b.id AND b.dept_id IS NOT NULL AND a.dept_id <> b.dept_id ORDER BY a.name, a.id, b.id LIMIT 20`,
        note: '先用 GROUP BY 把"跨部门重名"的人筛出来（800 多组），再做自连接。自连接的表更小，代价更低。',
      },
    ],
    followups: [
      '去掉 a.id < b.id 会多出什么？',
      '如果只是"同名"不管部门，用 GROUP BY 加 HAVING COUNT(*) > 1 就够了，为什么这题不能直接那么写？',
      'a.dept_id <> b.dept_id 在任一方为 NULL 时返回什么？为什么前面要先加 IS NOT NULL？',
    ],
  },

  {
    id: 'join-12',
    module: 'JOIN 与反连接',
    difficulty: 3,
    title: '部门 × 职级的人数矩阵',
    schema: 'company',
    tags: ['CROSS JOIN', 'LEFT JOIN', '条件补零'],
    description: '做一张 12 个部门 × 7 个职级的完整矩阵，某个部门没有某个职级时要显示 0，不能直接消失。这题考的是 CROSS JOIN 造骨架、LEFT JOIN 补数据的组合拳。',
    requirements: ['输出 3 列：dept_name、title、cnt', '每个部门 × 每个职级都要有一行（共 84 行）', 'cnt 为该组合的人数，没有则记 0', '按 dept_name、title 升序'],
    expectedColumns: ['dept_name', 'title', 'cnt'],
    reference: `SELECT d.name AS dept_name, t.title, COUNT(e.id) AS cnt
FROM departments d
CROSS JOIN (SELECT DISTINCT title FROM employees) t
LEFT JOIN employees e ON e.dept_id = d.id AND e.title = t.title
GROUP BY d.name, t.title
ORDER BY d.name, t.title`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'CROSS JOIN 造骨架 + LEFT JOIN 填数',
        sql: `SELECT d.name AS dept_name, t.title, COUNT(e.id) AS cnt FROM departments d CROSS JOIN (SELECT DISTINCT title FROM employees) t LEFT JOIN employees e ON e.dept_id = d.id AND e.title = t.title GROUP BY d.name, t.title ORDER BY d.name, t.title`,
        note: '关键在 LEFT JOIN 的两个条件都写在 ON 里。如果把 e.title = t.title 挪到 WHERE，LEFT JOIN 会退化成 INNER JOIN，空组合就全被过滤掉了。',
      },
      {
        label: '先聚合再用 IFNULL 补零',
        sql: `SELECT d.name AS dept_name, t.title, IFNULL(x.cnt, 0) AS cnt FROM departments d CROSS JOIN (SELECT DISTINCT title FROM employees) t LEFT JOIN (SELECT dept_id, title, COUNT(*) AS cnt FROM employees GROUP BY dept_id, title) x ON x.dept_id = d.id AND x.title = t.title ORDER BY d.name, t.title`,
        note: '把聚合提前到子查询里，外层只负责补零。矩阵很大时这种写法扫描量更小。',
      },
    ],
    followups: [
      '为什么 COUNT(e.id) 不能换成 COUNT(*)？',
      '把 e.title = t.title 从 ON 移到 WHERE，结果会少多少行？',
      '如果骨架不是"部门×职级"而是"日期×类目"，怎么保证日期连续？',
    ],
  },

  {
    id: 'join-13',
    module: 'JOIN 与反连接',
    difficulty: 3,
    title: '按薪资区间打标签（非等值连接）',
    schema: 'company',
    tags: ['非等值连接', '派生表', 'UNION ALL'],
    description: '用一张"区间表"给每个员工打薪资标签。区间表没有实体表，用 UNION ALL 临时造出来。这是非等值连接的典型用法：连接条件不是 =，而是 BETWEEN 或 >= / <。',
    requirements: ['输出 4 列：id、name、salary、band', 'band 按区间：<10000 低，10000–25000 中，25000–45000 高，≥45000 极高', '按 id 升序，取前 20 行'],
    expectedColumns: ['id', 'name', 'salary', 'band'],
    reference: `SELECT e.id, e.name, e.salary, b.band
FROM employees e
JOIN (
  SELECT '低' AS band, 0 AS lo, 10000 AS hi
  UNION ALL SELECT '中', 10000, 25000
  UNION ALL SELECT '高', 25000, 45000
  UNION ALL SELECT '极高', 45000, 1000000
) b ON e.salary >= b.lo AND e.salary < b.hi
ORDER BY e.id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '区间表 JOIN',
        sql: `SELECT e.id, e.name, e.salary, b.band FROM employees e JOIN (SELECT '低' AS band, 0 AS lo, 10000 AS hi UNION ALL SELECT '中', 10000, 25000 UNION ALL SELECT '高', 25000, 45000 UNION ALL SELECT '极高', 45000, 1000000) b ON e.salary >= b.lo AND e.salary < b.hi ORDER BY e.id LIMIT 20`,
        note: '区间表存在数据库里时，改分档只要改数据不用改 SQL。这是它比 CASE 更好的地方。',
      },
      {
        label: 'CASE WHEN',
        sql: `SELECT id, name, salary, CASE WHEN salary < 10000 THEN '低' WHEN salary < 25000 THEN '中' WHEN salary < 45000 THEN '高' ELSE '极高' END AS band FROM employees ORDER BY id LIMIT 20`,
        note: '只有几档时 CASE 更简单，也不用造临时表。缺点是把业务规则硬编码进了 SQL。',
      },
    ],
    followups: [
      '如果区间有重叠（比如两个区间都覆盖 20000），会发生什么？',
      '为什么用 >= lo AND < hi 而不是 BETWEEN？',
      '区间表有 1 万行时，这个 JOIN 会退化成什么？怎么优化？',
    ],
  },

  {
    id: 'join-14',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '总分最高的 20 名学生',
    schema: 'school',
    tags: ['JOIN', 'SUM', 'TOP N'],
    description: '把每个学生所有科目的分数加起来排个名。缺考的科目是 NULL，SUM 会自动跳过。',
    requirements: ['输出 3 列：id、name、total', 'total = SUM(score)，保留 2 位小数', '按 total 降序，相同则按 id 升序', '取前 20 行'],
    expectedColumns: ['id', 'name', 'total'],
    reference: `SELECT st.id, st.name, ROUND(SUM(sc.score), 2) AS total
FROM students st
JOIN scores sc ON sc.student_id = st.id
GROUP BY st.id, st.name
ORDER BY total DESC, st.id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'JOIN + SUM',
        sql: `SELECT st.id, st.name, ROUND(SUM(sc.score), 2) AS total FROM students st JOIN scores sc ON sc.student_id = st.id GROUP BY st.id, st.name ORDER BY total DESC, st.id LIMIT 20`,
        note: 'SUM 忽略 NULL，所以缺考不会拉低总分——但这意味着"选课多的人"天然占便宜。',
      },
      {
        label: '先聚合再关联',
        sql: `SELECT st.id, st.name, t.total FROM students st JOIN (SELECT student_id, ROUND(SUM(score), 2) AS total FROM scores GROUP BY student_id) t ON t.student_id = st.id ORDER BY t.total DESC, st.id LIMIT 20`,
        note: '先把 2 万行成绩聚合成 3 千行，再关联学生表。学生表和成绩表都很大时，这个顺序更省内存。',
      },
    ],
    followups: [
      '如果缺考记 0 分而不是 NULL，总分排名会变吗？',
      '选课数不同的学生直接比总分公平吗？怎么改成比平均分？',
      '想同时输出总分排名和平均分排名，怎么写？',
    ],
  },

  {
    id: 'join-15',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '参与人数最多的 10 个项目',
    schema: 'company',
    tags: ['JOIN', 'COUNT', 'TOP N'],
    description: '项目表关联参与关系表，统计每个项目有多少人参与，取最多的 10 个。',
    requirements: ['输出 3 列：id、name、members', 'members 是参与人数', '按 members 降序，相同则按 id 升序', '取前 10 行'],
    expectedColumns: ['id', 'name', 'members'],
    reference: `SELECT p.id, p.name, COUNT(ep.employee_id) AS members
FROM projects p
JOIN employee_projects ep ON ep.project_id = p.id
GROUP BY p.id, p.name
ORDER BY members DESC, p.id
LIMIT 10`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'JOIN + COUNT',
        sql: `SELECT p.id, p.name, COUNT(ep.employee_id) AS members FROM projects p JOIN employee_projects ep ON ep.project_id = p.id GROUP BY p.id, p.name ORDER BY members DESC, p.id LIMIT 10`,
        note: '参与关系表的主键是 (employee_id, project_id)，所以同一项目内不会有重复员工，直接 COUNT 即可。',
      },
      {
        label: 'LEFT JOIN 版',
        sql: `SELECT p.id, p.name, COUNT(ep.employee_id) AS members FROM projects p LEFT JOIN employee_projects ep ON ep.project_id = p.id GROUP BY p.id, p.name ORDER BY members DESC, p.id LIMIT 10`,
        note: '换成 LEFT JOIN 后，"没人参与的项目"也会出现（members = 0）。取头部时结果一样，但统计口径更完整。',
      },
    ],
    followups: [
      '如果参与关系表里同一个员工在同一个项目有多条记录，COUNT 会算错吗？怎么防？',
      '想按"总工时"排而不是按人数排，怎么改？',
      '要同时看人数和人均工时，SQL 怎么写？',
    ],
  },

  {
    id: 'join-16',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '每个部门的项目预算总额',
    schema: 'company',
    tags: ['LEFT JOIN', 'SUM', 'COALESCE'],
    description: '按部门汇总项目预算。没有项目的部门要显示 0，不能是 NULL。',
    requirements: ['输出 3 列：id、name、total_budget', 'total_budget = SUM(budget)，没有项目时为 0', '按 total_budget 降序，相同则按 id 升序'],
    expectedColumns: ['id', 'name', 'total_budget'],
    reference: `SELECT d.id, d.name, COALESCE(SUM(p.budget), 0) AS total_budget
FROM departments d
LEFT JOIN projects p ON p.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY total_budget DESC, d.id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN + COALESCE',
        sql: `SELECT d.id, d.name, COALESCE(SUM(p.budget), 0) AS total_budget FROM departments d LEFT JOIN projects p ON p.dept_id = d.id GROUP BY d.id, d.name ORDER BY total_budget DESC, d.id`,
        note: 'COALESCE 返回第一个非 NULL 值。没有项目的部门 SUM 返回 NULL，被替换成 0。',
      },
      {
        label: 'IFNULL',
        sql: `SELECT d.id, d.name, IFNULL(SUM(p.budget), 0) AS total_budget FROM departments d LEFT JOIN projects p ON p.dept_id = d.id GROUP BY d.id, d.name ORDER BY total_budget DESC, d.id`,
        note: 'IFNULL 是 MySQL 专有的两参数版本，效果一样。COALESCE 是标准 SQL，参数可以有多个，可移植性更好。',
      },
    ],
    followups: [
      'SUM 在没有匹配行时返回 NULL 还是 0？COUNT 呢？',
      'COALESCE、IFNULL、NULLIF 三者的区别？',
      '如果预算列本身允许 NULL，COALESCE(SUM(budget), 0) 会不会把"有项目但预算为空"也算成 0？这合理吗？',
    ],
  },

  {
    id: 'join-17',
    module: 'JOIN 与反连接',
    difficulty: 3,
    title: '每个部门人均参与几个项目',
    schema: 'company',
    tags: ['多表 JOIN', 'COUNT DISTINCT', '人均'],
    description: '先算每个部门有多少员工、一共产生了多少条项目参与记录，再算人均。注意分母是部门人数，不是参与记录数。',
    requirements: ['输出 4 列：dept_name、employees、project_links、per_capita', 'employees 是部门人数，project_links 是参与记录数，per_capita = project_links / employees 保留 2 位小数', '按 per_capita 降序，相同则按 dept_name 升序'],
    expectedColumns: ['dept_name', 'employees', 'project_links', 'per_capita'],
    reference: `SELECT d.name AS dept_name,
       COUNT(DISTINCT e.id) AS employees,
       COUNT(ep.project_id) AS project_links,
       ROUND(COUNT(ep.project_id) / COUNT(DISTINCT e.id), 2) AS per_capita
FROM departments d
JOIN employees e ON e.dept_id = d.id
LEFT JOIN employee_projects ep ON ep.employee_id = e.id
GROUP BY d.id, d.name
ORDER BY per_capita DESC, dept_name`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '一次 JOIN 用 COUNT DISTINCT 去重',
        sql: `SELECT d.name AS dept_name, COUNT(DISTINCT e.id) AS employees, COUNT(ep.project_id) AS project_links, ROUND(COUNT(ep.project_id) / COUNT(DISTINCT e.id), 2) AS per_capita FROM departments d JOIN employees e ON e.dept_id = d.id LEFT JOIN employee_projects ep ON ep.employee_id = e.id GROUP BY d.id, d.name ORDER BY per_capita DESC, dept_name`,
        note: '员工被项目记录"放大"了，所以数人数必须 DISTINCT，否则一个人参与 5 个项目会被算成 5 个人。',
      },
      {
        label: '两段聚合再关联',
        sql: `SELECT d.name AS dept_name, a.employees, COALESCE(b.project_links, 0) AS project_links, ROUND(COALESCE(b.project_links, 0) / a.employees, 2) AS per_capita FROM departments d JOIN (SELECT dept_id, COUNT(*) AS employees FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id) a ON a.dept_id = d.id LEFT JOIN (SELECT e.dept_id, COUNT(*) AS project_links FROM employee_projects ep JOIN employees e ON e.id = ep.employee_id GROUP BY e.dept_id) b ON b.dept_id = d.id ORDER BY per_capita DESC, dept_name`,
        note: '两个指标分别聚合再合并，不需要 DISTINCT，逻辑也更清楚。代价是 SQL 变长。',
      },
    ],
    followups: [
      '如果 employees 不用 COUNT(DISTINCT)，结果会偏大还是偏小？为什么？',
      '为什么这里用 LEFT JOIN 连 employee_projects 而不是 JOIN？',
      '人均指标在这种"一对多再聚合"的场景里，最容易算错的地方是什么？',
    ],
  },

  {
    id: 'join-18',
    module: 'JOIN 与反连接',
    difficulty: 3,
    title: '参与 3 个以上项目的员工',
    schema: 'company',
    tags: ['多表 JOIN', 'HAVING', 'COUNT DISTINCT'],
    description: '三张表串起来：员工、部门、项目参与关系。筛出参与项目数 ≥ 3 的人，按总工时排序。',
    requirements: ['输出 5 列：id、name、dept_name、projects、total_hours', 'projects 是去重后的项目数，total_hours 是工时总和', '只保留 projects >= 3 的员工', '按 total_hours 降序，相同则按 id 升序', '取前 20 行'],
    expectedColumns: ['id', 'name', 'dept_name', 'projects', 'total_hours'],
    reference: `SELECT e.id, e.name, d.name AS dept_name,
       COUNT(DISTINCT ep.project_id) AS projects,
       SUM(ep.hours) AS total_hours
FROM employees e
JOIN departments d ON d.id = e.dept_id
JOIN employee_projects ep ON ep.employee_id = e.id
GROUP BY e.id, e.name, d.name
HAVING COUNT(DISTINCT ep.project_id) >= 3
ORDER BY total_hours DESC, e.id
LIMIT 20`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '三表 JOIN + HAVING',
        sql: `SELECT e.id, e.name, d.name AS dept_name, COUNT(DISTINCT ep.project_id) AS projects, SUM(ep.hours) AS total_hours FROM employees e JOIN departments d ON d.id = e.dept_id JOIN employee_projects ep ON ep.employee_id = e.id GROUP BY e.id, e.name, d.name HAVING COUNT(DISTINCT ep.project_id) >= 3 ORDER BY total_hours DESC, e.id LIMIT 20`,
        note: '参与关系表主键是 (employee_id, project_id)，理论上不需要 DISTINCT，但写上更保险，也能防住脏数据。',
      },
      {
        label: '先聚合再关联',
        sql: `SELECT e.id, e.name, d.name AS dept_name, t.projects, t.total_hours FROM employees e JOIN departments d ON d.id = e.dept_id JOIN (SELECT employee_id, COUNT(*) AS projects, SUM(hours) AS total_hours FROM employee_projects GROUP BY employee_id HAVING COUNT(*) >= 3) t ON t.employee_id = e.id ORDER BY t.total_hours DESC, e.id LIMIT 20`,
        note: '先在 1.2 万行关系表上过滤出"项目数 ≥ 3"的人，再关联员工和部门。中间结果更小，通常更快。',
      },
    ],
    followups: [
      '这里为什么用 JOIN 而不是 LEFT JOIN？换成 LEFT JOIN 结果会怎样？',
      'HAVING 里的条件和子查询里的 HAVING，哪个更早生效？',
      '如果要按部门汇总"参与 3 个以上项目的人数"，怎么在这个基础上改？',
    ],
  },

  {
    id: 'cmp-join-01',
    module: 'JOIN 与反连接',
    difficulty: 2,
    title: '从没参与过项目的员工',
    schema: 'company',
    tags: ['LEFT JOIN', '反连接', 'NULL 判断'],
    description: '找出所有从未被分配过任何项目的员工。注意 employee_projects 里不是每个员工都有记录。',
    requirements: ['输出 3 列：id、name、title', '按 id 升序排列'],
    expectedColumns: ['id', 'name', 'title'],
    reference: `SELECT e.id, e.name, e.title
FROM employees e
LEFT JOIN employee_projects ep ON ep.employee_id = e.id
WHERE ep.employee_id IS NULL
ORDER BY e.id`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN + IS NULL（反连接）',
        sql: `SELECT e.id, e.name, e.title FROM employees e LEFT JOIN employee_projects ep ON ep.employee_id = e.id WHERE ep.employee_id IS NULL ORDER BY e.id`,
        note: '左连接后右表没有匹配的行会补 NULL，所以「IS NULL」正好筛出没有匹配的。判断要用右表的列，用 e.id IS NULL 会永远不成立。',
      },
      {
        label: 'NOT EXISTS（通常更推荐）',
        sql: `SELECT e.id, e.name, e.title FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employee_projects ep WHERE ep.employee_id = e.id) ORDER BY e.id`,
        note: '语义最清晰，而且遇到右表有 NULL 时也不会出错（NOT IN 就会踩坑）。',
      },
      {
        label: 'NOT IN（有陷阱）',
        sql: `SELECT id, name, title FROM employees WHERE id NOT IN (SELECT employee_id FROM employee_projects) ORDER BY id`,
        note: '这个例子能跑对，但如果子查询结果里有 NULL，NOT IN 会让整个条件变成 UNKNOWN，返回空集。这是面试高频陷阱，所以更推荐 NOT EXISTS。',
      },
    ],
    followups: [
      '如果子查询写成 NOT IN (SELECT employee_id FROM employee_projects WHERE employee_id IS NULL)，会返回什么？为什么？',
      'NOT EXISTS 和 NOT IN 在 MySQL 里的执行计划有什么区别？',
      '如果改成「参与项目数少于 2 个的员工」，包括 0 个的，SQL 怎么写？',
    ],
  },
];
