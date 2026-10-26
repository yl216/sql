// 模块 2：聚合与分组
export const AGGREGATE = [
  {
    id: 'agg-01',
    module: '聚合与分组',
    difficulty: 1,
    title: '全公司有多少人、平均薪资多少',
    schema: 'company',
    tags: ['COUNT', 'AVG'],
    description: '一次查出员工总数和平均月薪。最短的一道题，但 COUNT(*) 和 COUNT(列) 的区别几乎每场面试都会问。',
    requirements: ['输出 2 列：total、avg_salary', 'total 是员工总数，avg_salary 保留 2 位小数', '只返回 1 行'],
    expectedColumns: ['total', 'avg_salary'],
    reference: `SELECT COUNT(*) AS total, ROUND(AVG(salary), 2) AS avg_salary
FROM employees`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'COUNT(*) + AVG',
        sql: `SELECT COUNT(*) AS total, ROUND(AVG(salary), 2) AS avg_salary FROM employees`,
        note: 'COUNT(*) 统计行数，不关心列值。聚合函数在没有 GROUP BY 时把整张表当作一个分组，所以只返回 1 行。',
      },
      {
        label: 'COUNT(1)',
        sql: `SELECT COUNT(1) AS total, ROUND(AVG(salary), 2) AS avg_salary FROM employees`,
        note: '和 COUNT(*) 结果一样，MySQL 优化器会把它们处理成同一件事。可读性上 COUNT(*) 更符合"数行数"的语义。',
      },
    ],
    followups: [
      'COUNT(*)、COUNT(1)、COUNT(列名) 三者有什么区别？',
      '如果 salary 有 NULL，AVG 会把它算成 0 吗？',
      '没有 GROUP BY 的聚合查询里，能不能同时 SELECT 一个普通列？为什么？',
    ],
  },

  {
    id: 'agg-02',
    module: '聚合与分组',
    difficulty: 2,
    title: '每个部门有多少人',
    schema: 'company',
    tags: ['GROUP BY', 'LEFT JOIN', 'COUNT'],
    description: '按部门统计人数。注意有 119 位员工没有部门，他们不属于任何部门，不应该出现在结果里；同时每个部门都要出现，哪怕人数为 0。',
    requirements: ['输出 2 列：dept_name、headcount', '每个部门一行，包含没有员工的部门（headcount 为 0）', '按 headcount 降序，相同则按 dept_name 升序'],
    expectedColumns: ['dept_name', 'headcount'],
    reference: `SELECT d.name AS dept_name, COUNT(e.id) AS headcount
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY headcount DESC, dept_name`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN + COUNT(e.id)（推荐）',
        sql: `SELECT d.name AS dept_name, COUNT(e.id) AS headcount FROM departments d LEFT JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY headcount DESC, dept_name`,
        note: '必须数右表的列。COUNT(e.id) 对没匹配上的行返回 NULL，COUNT 会跳过 NULL，所以是 0。',
      },
      {
        label: '相关子查询',
        sql: `SELECT d.name AS dept_name, (SELECT COUNT(*) FROM employees e WHERE e.dept_id = d.id) AS headcount FROM departments d ORDER BY headcount DESC, dept_name`,
        note: '只有 12 个部门，子查询跑 12 次很划算，可读性也更好。部门数量上千时就该换成 JOIN 了。',
      },
      {
        label: '错误示范：COUNT(*)',
        sql: `SELECT d.name AS dept_name, COUNT(*) AS headcount FROM departments d LEFT JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY headcount DESC, dept_name`,
        note: 'COUNT(*) 数的是结果集行数，LEFT JOIN 后没员工的部门也会有一行（右表全是 NULL），所以空部门会被算成 1 人。',
        wrong: true,
      },
    ],
    followups: [
      '为什么 COUNT(*) 会把空部门算成 1 人，COUNT(e.id) 就不会？',
      'GROUP BY d.id, d.name 为什么通常要带上主键 d.id？只写 d.name 有什么风险？',
      '如果要统计的人数里包含"未分配部门"的那 119 人，SQL 怎么改？',
    ],
  },

  {
    id: 'agg-03',
    module: '聚合与分组',
    difficulty: 1,
    title: '每个部门的最高与最低薪资',
    schema: 'company',
    tags: ['GROUP BY', 'MAX', 'MIN'],
    description: '按部门算出薪资的最高值和最低值，顺带看看部门之间的差距。',
    requirements: ['输出 3 列：dept_name、max_salary、min_salary', '只统计有部门的员工', '按 max_salary 降序，相同则按 dept_name 升序'],
    expectedColumns: ['dept_name', 'max_salary', 'min_salary'],
    reference: `SELECT d.name AS dept_name, MAX(e.salary) AS max_salary, MIN(e.salary) AS min_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY max_salary DESC, dept_name`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'JOIN + MAX/MIN',
        sql: `SELECT d.name AS dept_name, MAX(e.salary) AS max_salary, MIN(e.salary) AS min_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY max_salary DESC, dept_name`,
        note: '标准写法。MAX/MIN 会自动忽略 NULL。',
      },
      {
        label: '只按部门名分组',
        sql: `SELECT d.name AS dept_name, MAX(e.salary) AS max_salary, MIN(e.salary) AS min_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.name ORDER BY max_salary DESC, dept_name`,
        note: '因为部门名唯一，按名字分组结果一样。但现实里部门可能重名，带上主键更稳妥。',
      },
    ],
    followups: [
      '怎么查出"每个部门薪资最高的人是谁"？直接 SELECT name, MAX(salary) 能行吗？',
      'MAX 和 MIN 遇到全为 NULL 的分组返回什么？',
      '如果要同时看最高、最低、平均，聚合函数会扫几遍表？',
    ],
  },

  {
    id: 'agg-04',
    module: '聚合与分组',
    difficulty: 2,
    title: '人数超过 410 的部门',
    schema: 'company',
    tags: ['HAVING', 'GROUP BY'],
    description: '先按部门分组数人数，再只留下人数超过 410 的部门。这里的关键是：过滤聚合结果必须用 HAVING，不能用 WHERE。',
    requirements: ['输出 2 列：dept_name、headcount', '只保留 headcount > 410 的部门', '按 headcount 降序，相同则按 dept_name 升序'],
    expectedColumns: ['dept_name', 'headcount'],
    reference: `SELECT d.name AS dept_name, COUNT(*) AS headcount
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
HAVING COUNT(*) > 410
ORDER BY headcount DESC, dept_name`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'HAVING + 聚合表达式',
        sql: `SELECT d.name AS dept_name, COUNT(*) AS headcount FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name HAVING COUNT(*) > 410 ORDER BY headcount DESC, dept_name`,
        note: '最稳妥的写法，所有数据库都支持。',
      },
      {
        label: 'HAVING + 别名',
        sql: `SELECT d.name AS dept_name, COUNT(*) AS headcount FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name HAVING headcount > 410 ORDER BY headcount DESC, dept_name`,
        note: 'MySQL 允许 HAVING 引用 SELECT 里的别名（标准 SQL 不保证），写起来更短，但换数据库可能报错。',
      },
    ],
    followups: [
      '为什么 WHERE COUNT(*) > 410 会报错？',
      'SQL 的执行顺序是怎样的？WHERE 和 HAVING 各在哪一步？',
      '如果条件里既有普通列过滤又有聚合过滤，应该怎么写？',
    ],
  },

  {
    id: 'agg-05',
    module: '聚合与分组',
    difficulty: 1,
    title: '每个城市有多少客户',
    schema: 'shop',
    tags: ['GROUP BY', 'COUNT'],
    description: '客户表里记录了所在城市，统计每个城市的客户数量。',
    requirements: ['输出 2 列：city、customers', '每个城市一行', '按 customers 降序，相同则按 city 升序'],
    expectedColumns: ['city', 'customers'],
    reference: `SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city
ORDER BY customers DESC, city`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'GROUP BY + COUNT(*)',
        sql: `SELECT city, COUNT(*) AS customers FROM customers GROUP BY city ORDER BY customers DESC, city`,
        note: '单表分组，最简单的形态。',
      },
      {
        label: 'GROUP BY 序号',
        sql: `SELECT city, COUNT(*) AS customers FROM customers GROUP BY 1 ORDER BY customers DESC, city`,
        note: 'GROUP BY 1 表示按第 1 个输出列分组。省字，但可读性差、可移植性差，团队里一般不建议用。',
      },
    ],
    followups: [
      '如果 city 里有 NULL，GROUP BY 会把它们归成一组吗？',
      '想同时看全国总计，怎么在不写两条 SQL 的情况下做到？（WITH ROLLUP）',
      '按城市分组后想按"客户数占总数的比例"排序，怎么写？',
    ],
  },

  {
    id: 'agg-06',
    module: '聚合与分组',
    difficulty: 1,
    title: '每个类目的商品数与均价',
    schema: 'shop',
    tags: ['GROUP BY', 'AVG', 'MAX'],
    description: '商品表有类目和价格，按类目统计商品数量、平均售价和最高售价。',
    requirements: ['输出 4 列：category、products、avg_price、max_price', 'avg_price 保留 2 位小数', '按 avg_price 降序，相同则按 category 升序'],
    expectedColumns: ['category', 'products', 'avg_price', 'max_price'],
    reference: `SELECT category, COUNT(*) AS products,
       ROUND(AVG(price), 2) AS avg_price,
       MAX(price) AS max_price
FROM products
GROUP BY category
ORDER BY avg_price DESC, category`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '一次扫描算三个指标',
        sql: `SELECT category, COUNT(*) AS products, ROUND(AVG(price), 2) AS avg_price, MAX(price) AS max_price FROM products GROUP BY category ORDER BY avg_price DESC, category`,
        note: '多个聚合函数可以在同一个分组里一起算，不需要扫多遍表。',
      },
      {
        label: '先分组再排序',
        sql: `SELECT t.category, t.products, t.avg_price, t.max_price FROM (SELECT category, COUNT(*) AS products, ROUND(AVG(price), 2) AS avg_price, MAX(price) AS max_price FROM products GROUP BY category) t ORDER BY t.avg_price DESC, t.category`,
        note: '多套一层派生表，逻辑完全一样。需要再对聚合结果做二次计算时才这么写。',
      },
    ],
    followups: [
      'AVG(price) 和 SUM(price)/COUNT(*) 结果一样吗？什么时候会不一样？',
      '想按"类目内价格排名"取每个类目前 3 贵的商品，怎么写？',
      '如果某类目一个商品都没有，它会出现在结果里吗？',
    ],
  },

  {
    id: 'agg-07',
    module: '聚合与分组',
    difficulty: 3,
    title: '每个部门有几个经理',
    schema: 'company',
    tags: ['条件聚合', 'SUM CASE', 'COUNT CASE'],
    description: '一次查询里同时算部门总人数和经理人数。条件聚合是面试里区分度很高的点：它把"行过滤"变成了"列计算"。',
    requirements: ['输出 3 列：dept_name、headcount、managers', 'headcount 是部门总人数，managers 是职级为「经理」的人数', '按 managers 降序，相同则按 dept_name 升序'],
    expectedColumns: ['dept_name', 'headcount', 'managers'],
    reference: `SELECT d.name AS dept_name,
       COUNT(*) AS headcount,
       SUM(CASE WHEN e.title = '经理' THEN 1 ELSE 0 END) AS managers
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY managers DESC, dept_name`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'SUM(CASE WHEN ...)',
        sql: `SELECT d.name AS dept_name, COUNT(*) AS headcount, SUM(CASE WHEN e.title = '经理' THEN 1 ELSE 0 END) AS managers FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY managers DESC, dept_name`,
        note: 'ELSE 0 不能省。省掉后不匹配的行返回 NULL，SUM 会跳过它们——结果恰好也对，但语义上不如写清楚。',
      },
      {
        label: 'COUNT(CASE WHEN ...)',
        sql: `SELECT d.name AS dept_name, COUNT(*) AS headcount, COUNT(CASE WHEN e.title = '经理' THEN 1 END) AS managers FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY managers DESC, dept_name`,
        note: 'COUNT 只数非 NULL，所以这里要省略 ELSE（或者写 ELSE NULL）。写成 ELSE 0 会把所有人都数进去。',
      },
      {
        label: 'COUNT(IF(...))',
        sql: `SELECT d.name AS dept_name, COUNT(*) AS headcount, COUNT(IF(e.title = '经理', 1, NULL)) AS managers FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY managers DESC, dept_name`,
        note: 'IF 版更短，逻辑和 COUNT(CASE) 一样。可移植性不如 CASE，PostgreSQL 不支持 IF()。',
      },
    ],
    followups: [
      'COUNT(CASE WHEN ... THEN 1 ELSE 0 END) 会得到什么？为什么？',
      '如果还要算"总监人数"和"技术专家人数"，SQL 会变得多长？有没有更清爽的写法？',
      '条件聚合和写三条 SQL 再 JOIN 起来，性能和可读性各有什么取舍？',
    ],
  },

  {
    id: 'agg-08',
    module: '聚合与分组',
    difficulty: 2,
    title: '订单状态分布与占比',
    schema: 'shop',
    tags: ['GROUP BY', '占比', '标量子查询'],
    description: '按状态统计订单数和占比。占比需要"分组后的值"除以"全表总数"，这是分组查询里最常见的跨层级计算。',
    requirements: ['输出 3 列：status、orders、pct', 'pct 是该状态订单数占总订单数的百分比，保留 2 位小数', '按 orders 降序，相同则按 status 升序'],
    expectedColumns: ['status', 'orders', 'pct'],
    reference: `SELECT status,
       COUNT(*) AS orders,
       ROUND(COUNT(*) * 100 / (SELECT COUNT(*) FROM orders), 2) AS pct
FROM orders
GROUP BY status
ORDER BY orders DESC, status`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '标量子查询做分母',
        sql: `SELECT status, COUNT(*) AS orders, ROUND(COUNT(*) * 100 / (SELECT COUNT(*) FROM orders), 2) AS pct FROM orders GROUP BY status ORDER BY orders DESC, status`,
        note: '子查询没有关联外层，MySQL 只会执行一次并缓存结果，不会因为 4 个分组就跑 4 遍。',
      },
      {
        label: '窗口函数做分母',
        sql: `SELECT status, orders, ROUND(orders * 100 / SUM(orders) OVER (), 2) AS pct FROM (SELECT status, COUNT(*) AS orders FROM orders GROUP BY status) t ORDER BY orders DESC, status`,
        note: 'SUM(...) OVER () 不带 PARTITION，等于对全部分组求和。分组维度多的时候比子查询更自然。',
      },
    ],
    followups: [
      '标量子查询放在 SELECT 里，会对每个分组执行一次吗？',
      '如果把分母写成 COUNT(*) 而不加子查询，会发生什么？',
      '占比合计一定是 100% 吗？什么情况下不是？',
    ],
  },

  {
    id: 'agg-09',
    module: '聚合与分组',
    difficulty: 2,
    title: '2024 年每个月的订单数与金额',
    schema: 'shop',
    tags: ['GROUP BY', 'DATE_FORMAT', '时间分组'],
    description: '把下单时间按月聚合成"2024-01"这种格式，统计每月的订单量和成交金额。时间分组是业务分析的日常操作。',
    requirements: ['输出 3 列：month、orders、amount', 'month 格式为 YYYY-MM，只统计 2024 年', 'amount 保留 2 位小数', '按 month 升序'],
    expectedColumns: ['month', 'orders', 'amount'],
    reference: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,
       COUNT(*) AS orders,
       ROUND(SUM(total_amount), 2) AS amount
FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'
GROUP BY month
ORDER BY month`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'DATE_FORMAT 分组',
        sql: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS orders, ROUND(SUM(total_amount), 2) AS amount FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY month ORDER BY month`,
        note: 'MySQL 允许 GROUP BY 用 SELECT 的别名。注意 WHERE 里的时间条件仍然是区间写法，能走索引。',
      },
      {
        label: 'GROUP BY 重复表达式',
        sql: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS orders, ROUND(SUM(total_amount), 2) AS amount FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY DATE_FORMAT(order_date, '%Y-%m') ORDER BY month`,
        note: '不依赖别名，标准 SQL 也能跑。缺点是表达式写两遍，改格式时容易漏。',
      },
    ],
    followups: [
      '如果某个月一单都没有，这个月会出现在结果里吗？怎么补上？',
      '按月分组时 DATE_FORMAT 会让索引失效吗？WHERE 条件为什么不受影响？',
      '想同时看每月订单数和累计订单数，怎么写？',
    ],
  },

  {
    id: 'agg-10',
    module: '聚合与分组',
    difficulty: 2,
    title: '下单最多的 20 个客户',
    schema: 'shop',
    tags: ['GROUP BY', 'LEFT JOIN', 'TOP N'],
    description: '统计每个客户的订单数，取最多的 20 个。用 LEFT JOIN 是为了让一单没下的客户也能出现在统计里（虽然这题取的是头部，用 INNER 结果一样，但习惯要养对）。',
    requirements: ['输出 3 列：id、name、order_count', '按 order_count 降序，相同则按 id 升序', '取前 20 行'],
    expectedColumns: ['id', 'name', 'order_count'],
    reference: `SELECT c.id, c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY order_count DESC, c.id
LIMIT 20`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN + COUNT(o.id)',
        sql: `SELECT c.id, c.name, COUNT(o.id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name ORDER BY order_count DESC, c.id LIMIT 20`,
        note: '数右表的列，没下单的客户会得到 0。取头部时 INNER JOIN 结果一样，但换成"订单最少的客户"就会差很多。',
      },
      {
        label: '先聚合再 JOIN',
        sql: `SELECT c.id, c.name, COALESCE(t.order_count, 0) AS order_count FROM customers c LEFT JOIN (SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id) t ON t.customer_id = c.id ORDER BY order_count DESC, c.id LIMIT 20`,
        note: '先把 5 万订单聚合成 8 千行，再和客户表关联。数据量大时这种"先聚合后连接"通常比直接 JOIN 再 GROUP BY 更快。',
      },
    ],
    followups: [
      '如果这里用 COUNT(*) 代替 COUNT(o.id)，结果会错在哪？',
      '"先聚合后 JOIN"为什么可能更快？什么情况下反而更慢？',
      '想取订单数第 2 到第 10 名的客户，怎么写？',
    ],
  },

  {
    id: 'agg-11',
    module: '聚合与分组',
    difficulty: 2,
    title: '每个城市的员工人数与平均薪资',
    schema: 'company',
    tags: ['GROUP BY', '多表聚合'],
    description: '部门表里有城市，员工表里有薪资，先关联再按城市汇总。',
    requirements: ['输出 3 列：city、headcount、avg_salary', 'avg_salary 保留 2 位小数', '按 headcount 降序，相同则按 city 升序'],
    expectedColumns: ['city', 'headcount', 'avg_salary'],
    reference: `SELECT d.city, COUNT(*) AS headcount, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.city
ORDER BY headcount DESC, d.city`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '关联后按城市分组',
        sql: `SELECT d.city, COUNT(*) AS headcount, ROUND(AVG(e.salary), 2) AS avg_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.city ORDER BY headcount DESC, d.city`,
        note: '最直接的写法。注意 GROUP BY 的是城市，不是部门。',
      },
      {
        label: '两段聚合',
        sql: `SELECT t.city, SUM(t.cnt) AS headcount, ROUND(SUM(t.total) / SUM(t.cnt), 2) AS avg_salary FROM (SELECT d.city, COUNT(*) AS cnt, SUM(e.salary) AS total FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.city) t GROUP BY t.city ORDER BY headcount DESC, t.city`,
        note: '先按部门算人数和薪资总额，再按城市汇总。这里必须用"总额/人数"加权，不能直接对部门平均值再求平均。',
      },
    ],
    followups: [
      '把各部门的平均薪资再求一次平均，和正确结果差多少？为什么？',
      '加权平均的正确写法是什么？',
      '如果要按城市+职级做交叉统计，SQL 结构要怎么改？',
    ],
  },

  {
    id: 'agg-12',
    module: '聚合与分组',
    difficulty: 2,
    title: '每门课的平均分与参考人数',
    schema: 'school',
    tags: ['AVG', 'NULL', 'COUNT'],
    description: '成绩表里有缺考记录（score 为 NULL）。统计每门课的选课人数、实际参考人数和平均分，注意这三个数不一定相等。',
    requirements: ['输出 5 列：id、name、enrolled、scored、avg_score', 'enrolled 是选课人数，scored 是有成绩的人数，avg_score 保留 2 位小数', '按 avg_score 降序，相同则按 id 升序'],
    expectedColumns: ['id', 'name', 'enrolled', 'scored', 'avg_score'],
    reference: `SELECT c.id, c.name,
       COUNT(*) AS enrolled,
       COUNT(s.score) AS scored,
       ROUND(AVG(s.score), 2) AS avg_score
FROM courses c
JOIN scores s ON s.course_id = c.id
GROUP BY c.id, c.name
ORDER BY avg_score DESC, c.id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'COUNT(*) 与 COUNT(列) 并排',
        sql: `SELECT c.id, c.name, COUNT(*) AS enrolled, COUNT(s.score) AS scored, ROUND(AVG(s.score), 2) AS avg_score FROM courses c JOIN scores s ON s.course_id = c.id GROUP BY c.id, c.name ORDER BY avg_score DESC, c.id`,
        note: 'COUNT(*) 数行数（含缺考），COUNT(s.score) 跳过 NULL（只数有分的）。两者一减就是缺考人次。',
      },
      {
        label: 'SUM/COUNT 手算平均',
        sql: `SELECT c.id, c.name, COUNT(*) AS enrolled, COUNT(s.score) AS scored, ROUND(SUM(s.score) / COUNT(s.score), 2) AS avg_score FROM courses c JOIN scores s ON s.course_id = c.id GROUP BY c.id, c.name ORDER BY avg_score DESC, c.id`,
        note: 'AVG 内部就是这么算的。手写一遍能看清"分母是参考人数，不是选课人数"，这个区别在统计里经常被搞错。',
      },
    ],
    followups: [
      'AVG 会把 NULL 当成 0 参与计算吗？',
      '如果某门课全部缺考，AVG 返回什么？COUNT(s.score) 返回多少？',
      '把缺考当成 0 分算进平均分，在业务上合理吗？两种口径差多少？',
    ],
  },

  {
    id: 'agg-13',
    module: '聚合与分组',
    difficulty: 2,
    title: '每门课的缺考人次',
    schema: 'school',
    tags: ['条件聚合', 'NULL', 'HAVING'],
    description: '只统计有缺考的课程，按缺考人次从多到少排。',
    requirements: ['输出 3 列：id、name、absent', 'absent 是该课程 score 为 NULL 的记录数', '只保留 absent > 0 的课程', '按 absent 降序，相同则按 id 升序'],
    expectedColumns: ['id', 'name', 'absent'],
    reference: `SELECT c.id, c.name,
       SUM(CASE WHEN s.score IS NULL THEN 1 ELSE 0 END) AS absent
FROM courses c
JOIN scores s ON s.course_id = c.id
GROUP BY c.id, c.name
HAVING absent > 0
ORDER BY absent DESC, c.id`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'SUM(CASE WHEN ... IS NULL)',
        sql: `SELECT c.id, c.name, SUM(CASE WHEN s.score IS NULL THEN 1 ELSE 0 END) AS absent FROM courses c JOIN scores s ON s.course_id = c.id GROUP BY c.id, c.name HAVING absent > 0 ORDER BY absent DESC, c.id`,
        note: '条件聚合的典型用法：把"满足条件的行"变成 1，再求和。',
      },
      {
        label: 'COUNT(*) - COUNT(score)',
        sql: `SELECT c.id, c.name, COUNT(*) - COUNT(s.score) AS absent FROM courses c JOIN scores s ON s.course_id = c.id GROUP BY c.id, c.name HAVING absent > 0 ORDER BY absent DESC, c.id`,
        note: '更短，语义也更直白：总行数减去有成绩的行数。但只适用于"用 NULL 表示缺失"这一种情况。',
      },
    ],
    followups: [
      '如果缺考不是记 NULL，而是记 0 分，这两种写法还能用吗？',
      'HAVING 里引用别名 absent，换成标准 SQL 该怎么写？',
      '想统计"缺考率"（缺考人次 / 选课人次），怎么写？',
    ],
  },

  {
    id: 'agg-14',
    module: '聚合与分组',
    difficulty: 2,
    title: '薪资总额最高的 5 个部门',
    schema: 'company',
    tags: ['GROUP BY', 'SUM', 'LIMIT'],
    description: '按部门汇总月薪总额，取前 5 名。分组后排序再截断，是报表里最常见的形态。',
    requirements: ['输出 2 列：dept_name、total_salary', 'total_salary 保留 2 位小数', '按 total_salary 降序，相同则按 dept_name 升序', '取前 5 行'],
    expectedColumns: ['dept_name', 'total_salary'],
    reference: `SELECT d.name AS dept_name, ROUND(SUM(e.salary), 2) AS total_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY total_salary DESC, dept_name
LIMIT 5`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'SUM + LIMIT',
        sql: `SELECT d.name AS dept_name, ROUND(SUM(e.salary), 2) AS total_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name ORDER BY total_salary DESC, dept_name LIMIT 5`,
        note: 'LIMIT 作用在排序之后，所以取到的确实是总额最高的 5 个。',
      },
      {
        label: '先聚合再排序',
        sql: `SELECT t.dept_name, t.total_salary FROM (SELECT d.name AS dept_name, ROUND(SUM(e.salary), 2) AS total_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name) t ORDER BY t.total_salary DESC, t.dept_name LIMIT 5`,
        note: '把聚合和排序拆成两层。需要再对总额做二次计算（比如算占比）时，这种结构更好扩展。',
      },
    ],
    followups: [
      '部门人数不同，总额排名和人均排名会一样吗？为什么？',
      '如果想按"人均薪资"取前 5，SQL 要改哪里？',
      'SUM 的结果类型是什么？会不会溢出？',
    ],
  },

  {
    id: 'agg-15',
    module: '聚合与分组',
    difficulty: 2,
    title: '每个类目的订单数与销量',
    schema: 'shop',
    tags: ['COUNT DISTINCT', '多表聚合'],
    description: '订单明细里一行是一种商品，同一个订单可能有多行。统计每个类目被多少个"不同订单"买过，以及一共卖了多少件。',
    requirements: ['输出 3 列：category、orders、units', 'orders 是买过该类目商品的去重订单数，units 是件数总和', '按 orders 降序，相同则按 category 升序'],
    expectedColumns: ['category', 'orders', 'units'],
    reference: `SELECT p.category,
       COUNT(DISTINCT oi.order_id) AS orders,
       SUM(oi.qty) AS units
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.category
ORDER BY orders DESC, p.category`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'COUNT(DISTINCT order_id)',
        sql: `SELECT p.category, COUNT(DISTINCT oi.order_id) AS orders, SUM(oi.qty) AS units FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.category ORDER BY orders DESC, p.category`,
        note: '必须 DISTINCT。同一个订单买了两件同类目商品，明细里是两行，不去重就会把订单数算多。',
      },
      {
        label: '先按订单+类目去重',
        sql: `SELECT t.category, COUNT(*) AS orders, SUM(t.qty) AS units FROM (SELECT oi.order_id, p.category, SUM(oi.qty) AS qty FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY oi.order_id, p.category) t GROUP BY t.category ORDER BY orders DESC, t.category`,
        note: '先把"订单×类目"压成一行，再统计。逻辑更清楚，代价是多一次分组，数据量大时比 COUNT(DISTINCT) 更容易走索引优化。',
      },
    ],
    followups: [
      '为什么这里不能直接用 COUNT(*)？会多算什么？',
      'COUNT(DISTINCT a, b) 是什么含义？',
      '如果按"订单数"排名和按"销量"排名不一样，说明什么业务现象？',
    ],
  },

  {
    id: 'cmp-agg-01',
    module: '聚合与分组',
    difficulty: 2,
    title: '平均薪资高于全公司的部门',
    schema: 'company',
    tags: ['GROUP BY', 'HAVING', '标量子查询'],
    description:
      '找出平均薪资高于全公司平均水平的部门，并按平均薪资从高到低排列。注意：有少数员工没有分配部门，计算全公司平均时他们也算在内。',
    requirements: [
      '输出 2 列：部门名 dept_name、平均薪资 avg_salary（保留 2 位小数）',
      '只统计有员工的部门',
      '按 avg_salary 降序排列',
    ],
    expectedColumns: ['dept_name', 'avg_salary'],
    reference: `SELECT d.name AS dept_name, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employees)
ORDER BY avg_salary DESC`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'HAVING + 标量子查询（最直观）',
        sql: `SELECT d.name AS dept_name, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employees)
ORDER BY avg_salary DESC`,
        note: '标量子查询只返回一个值，所以能直接放在 HAVING 里比较。这条子查询对每个分组求值一次，MySQL 8 会把它当常量缓存，不用太担心性能。',
      },
      {
        label: '派生表 CROSS JOIN 全公司均值',
        sql: `SELECT x.dept_name, ROUND(x.avg_salary, 2) AS avg_salary
FROM (
  SELECT d.id, d.name AS dept_name, AVG(e.salary) AS avg_salary
  FROM departments d JOIN employees e ON e.dept_id = d.id
  GROUP BY d.id, d.name
) x
CROSS JOIN (SELECT AVG(salary) AS comp_avg FROM employees) c
WHERE x.avg_salary > c.comp_avg
ORDER BY avg_salary DESC`,
        note: '把过滤条件从 HAVING 挪到外层 WHERE。两者结果一样，但派生表写法在需要复用聚合结果时更灵活。',
      },
      {
        label: '窗口函数一次算出全公司均值',
        sql: `SELECT dept_name, ROUND(avg_salary, 2) AS avg_salary
FROM (
  SELECT d.name AS dept_name,
         AVG(e.salary) OVER (PARTITION BY e.dept_id) AS avg_salary,
         AVG(e.salary) OVER () AS comp_avg
  FROM employees e JOIN departments d ON d.id = e.dept_id
) t
WHERE avg_salary > comp_avg
GROUP BY dept_name, avg_salary
ORDER BY avg_salary DESC`,
        note: '面试里说出来会加分：窗口函数不改变行数，所以要在外面再 DISTINCT 或 GROUP BY 去重。',
      },
    ],
    followups: [
      '如果把 HAVING 换成 WHERE，会报什么错？为什么？',
      '全公司平均薪资要不要排除 dept_id IS NULL 的员工？两种口径结果差多少？',
      'GROUP BY d.id, d.name 里为什么通常带上主键 d.id？',
    ],
  },
];
