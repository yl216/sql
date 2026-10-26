// 模块 6：索引与执行计划
// 这一章判的不只是结果对不对，还要看执行计划：扫描行数、访问方式、是否 filesort。
// 每题都配一个"看起来合理但慢"的写法（slow: true），verify 会断言它确实被判为低效。
export const INDEXES = [
  {
    id: 'shop-perf-01',
    module: '索引与执行计划',
    difficulty: 3,
    title: '2024 年 3 月成交额最高的订单',
    schema: 'shop',
    tags: ['索引', 'sargable', 'EXPLAIN', 'LIMIT'],
    description:
      '找出 2024 年 3 月内所有已完成订单中金额最高的 20 笔。这道题会同时判执行计划：orders 表有 5 万行，写法不对就会全表扫描。',
    requirements: [
      '输出 2 列：订单号 id、订单金额 total_amount',
      '状态为 completed，下单时间在 2024-03-01 00:00:00 到 2024-03-31 23:59:59 之间（含两端）',
      '按 total_amount 降序；金额相同时按 id 升序',
      '取前 20 行',
      '注意：orders 表上已有索引 (status, order_date)',
    ],
    expectedColumns: ['id', 'total_amount'],
    reference: `SELECT id, total_amount
FROM orders
WHERE status = 'completed'
  AND order_date >= '2024-03-01 00:00:00'
  AND order_date < '2024-04-01 00:00:00'
ORDER BY total_amount DESC, id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 3000, note: '索引 (status, order_date) 可用时只扫约 800 行' },
    solutions: [
      {
        label: '范围条件（能走索引）',
        sql: `SELECT id, total_amount
FROM orders
WHERE status = 'completed'
  AND order_date >= '2024-03-01 00:00:00'
  AND order_date < '2024-04-01 00:00:00'
ORDER BY total_amount DESC, id
LIMIT 20`,
        note: '列上不做任何函数运算，MySQL 才能用索引做范围扫描。用 < 下个月 1 号 而不是 <= 月末，可以避免漏掉 23:59:59.5 这种小数秒数据，也不用纠结大小月。',
      },
      {
        label: '错误示范：把列包在函数里',
        sql: `SELECT id, total_amount
FROM orders
WHERE status = 'completed'
  AND DATE_FORMAT(order_date, '%Y-%m') = '2024-03'
ORDER BY total_amount DESC, id
LIMIT 20`,
        note: '结果是对的，但 order_date 被函数包住后索引失效，只能全表扫描 5 万行。这类写法叫「不 sargable」，是线上慢查询最常见的成因。可以自己在页面点 EXPLAIN 对比两者的扫描行数。',
        slow: true,
      },
    ],
    followups: [
      '为什么 DATE_FORMAT(order_date, ...) 用不上索引？换成 YEAR(order_date)=2024 呢？',
      '如果把索引改成 (order_date, status)，这条查询还能走索引吗？',
      'ORDER BY total_amount DESC 需要额外排序吗？如果要彻底消除 filesort，索引该怎么建？',
      '深分页 LIMIT 100000, 20 为什么会变慢，怎么优化？',
    ],
  },

  {
    id: 'idx-01',
    module: '索引与执行计划',
    difficulty: 2,
    title: '查某个客户的订单',
    schema: 'shop',
    tags: ['等值查询', 'ref', 'sargable'],
    description:
      '最基础的索引场景：按客户编号查订单。orders 有 5 万行，但每个客户只有几单，走索引的话只碰这几行。这一题用来体会 ref 和全表扫描的差距。',
    requirements: ['输出 3 列：id、order_date、total_amount', '只保留 customer_id = 137 的订单', '顺序不限'],
    expectedColumns: ['id', 'order_date', 'total_amount'],
    reference: `SELECT id, order_date, total_amount
FROM orders
WHERE customer_id = 137`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 200, note: '索引 idx_orders_customer_date 可用时只碰 5 行' },
    solutions: [
      {
        label: '列上直接等值',
        sql: `SELECT id, order_date, total_amount FROM orders WHERE customer_id = 137`,
        note: '等号左边只有裸列名，索引就能直接定位到这几行。访问方式会显示 ref。',
      },
      {
        label: '错误示范：列上做运算',
        sql: `SELECT id, order_date, total_amount FROM orders WHERE customer_id + 0 = 137`,
        note: '结果一模一样，但 customer_id 参与了运算，索引列被"包住"了，只能逐行算一遍再比。5 万行全扫。这类写法叫不 sargable。',
        slow: true,
      },
    ],
    followups: [
      'EXPLAIN 里的 type 字段，ref、range、ALL 分别代表什么？',
      '如果把 customer_id = 137 换成 customer_id IN (137)，还能走索引吗？',
      '为什么"列上做运算"会让索引失效？B+ 树索引是按什么排序的？',
    ],
  },

  {
    id: 'idx-02',
    module: '索引与执行计划',
    difficulty: 2,
    title: '查某个商品的所有成交明细',
    schema: 'shop',
    tags: ['大表', '等值查询', '类型转换'],
    description:
      'order_items 有 10 万行，是全站最大的表。按商品编号查明细，走索引只碰 200 行，不走索引就要扫 10 万行——差距在这里最直观。',
    requirements: ['输出 3 列：id、qty、unit_price', '只保留 product_id = 42 的明细', '顺序不限'],
    expectedColumns: ['id', 'qty', 'unit_price'],
    reference: `SELECT id, qty, unit_price
FROM order_items
WHERE product_id = 42`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 2000, note: '索引 idx_items_product 可用时只碰约 200 行' },
    solutions: [
      {
        label: '直接用整数比较',
        sql: `SELECT id, qty, unit_price FROM order_items WHERE product_id = 42`,
        note: 'product_id 是 INT，和整数 77 比较，类型一致，索引直接可用。',
      },
      {
        label: '错误示范：转成字符串再比',
        sql: `SELECT id, qty, unit_price FROM order_items WHERE CAST(product_id AS CHAR) = '42'`,
        note: '结果一样，但列被函数包住，索引失效，10 万行全扫。很多 ORM 生成的 SQL 会犯这个错（比如把参数当字符串拼进去再转类型）。',
        slow: true,
      },
    ],
    followups: [
      '为什么把数字列 CAST 成字符串会让索引失效？',
      '如果是反过来：varchar 列和数字比较（如 phone = 13800138000），索引还能用吗？',
      '10 万行的表全扫一次大概多久？1000 万行呢？',
    ],
  },

  {
    id: 'idx-03',
    module: '索引与执行计划',
    difficulty: 2,
    title: '统计某个月的登录人次',
    schema: 'shop',
    tags: ['日期范围', 'range', 'DATE_FORMAT'],
    description:
      '登录日志有 7 万行。统计 2025 年 6 月一共有多少条登录记录。日期字段上的索引能不能用，取决于你把条件写成区间还是写成函数。',
    requirements: ['输出 1 列：cnt', '统计 login_date 在 2025 年 6 月的记录数', '只返回 1 行'],
    expectedColumns: ['cnt'],
    reference: `SELECT COUNT(*) AS cnt
FROM login_log
WHERE login_date >= '2025-06-01' AND login_date < '2025-07-01'`,
    ordered: false,
    roundTo: null,
    mustUse: null,
    perf: { maxRowsExamined: 8000, note: '日期区间走 range 只扫约 3000 行；用 DATE_FORMAT 会退化成扫全部 7 万行' },
    solutions: [
      {
        label: '左闭右开区间',
        sql: `SELECT COUNT(*) AS cnt FROM login_log WHERE login_date >= '2025-06-01' AND login_date < '2025-07-01'`,
        note: '列上不做运算，索引能做范围扫描（range）。用 < 下个月 1 号，既不会漏掉月末 23:59:59 的数据，也不用管这个月有 30 天还是 31 天。',
      },
      {
        label: '错误示范：DATE_FORMAT 包住列',
        sql: `SELECT COUNT(*) AS cnt FROM login_log WHERE DATE_FORMAT(login_date, '%Y-%m') = '2025-06'`,
        note: '结果一样，但每一行都要先算一次 DATE_FORMAT 才能比较，索引完全用不上，7 万行逐行计算。这是日期查询里最常见的慢查询写法。',
        slow: true,
      },
    ],
    followups: [
      'EXPLAIN 里出现 type=index 和 type=ALL 有什么区别？哪个更糟？',
      '如果一定要按月统计多个月，怎么写才能既正确又不拖慢？',
      '日期字段是 DATETIME 时，用 BETWEEN \'2025-06-01\' AND \'2025-06-30\' 会漏掉什么？',
    ],
  },

  {
    id: 'idx-04',
    module: '索引与执行计划',
    difficulty: 2,
    title: '按姓名精确找员工',
    schema: 'company',
    tags: ['字符串索引', '等值查询', '函数'],
    description:
      '员工表上有 name 索引。要查"姓名正好是冯英"的员工——注意是精确匹配，不是模糊搜索。精确匹配能走索引，套上函数就不能了。',
    requirements: ['输出 3 列：id、name、title', '只保留 name 等于「冯英」的员工', '顺序不限'],
    expectedColumns: ['id', 'name', 'title'],
    reference: `SELECT id, name, title
FROM employees
WHERE name = '冯英'`,
    ordered: false,
    roundTo: null,
    mustUse: null,
    perf: { maxRowsExamined: 100, note: 'name 索引可用时只碰十几行' },
    solutions: [
      {
        label: '直接等值比较',
        sql: `SELECT id, name, title FROM employees WHERE name = '冯英'`,
        note: '字符串索引也是按字典序排的，等值查询能直接定位。注意 collation 是 utf8mb4_0900_ai_ci，不区分大小写。',
      },
      {
        label: '错误示范：套一层 TRIM',
        sql: `SELECT id, name, title FROM employees WHERE TRIM(name) = '冯英'`,
        note: '很多人为了"防止前后空格"加 TRIM，结果把索引废掉了。正确的做法是在写入时就保证数据干净，而不是在查询时做清洗。',
        slow: true,
      },
    ],
    followups: [
      '为什么 TRIM(name) = ... 用不上索引，而 name = ... 可以？',
      '如果确实存在前后空格的历史数据，怎么优化这个查询？',
      'utf8mb4_0900_ai_ci 里的 ci 是什么含义？会影响索引吗？',
    ],
  },

  {
    id: 'idx-05',
    module: '索引与执行计划',
    difficulty: 3,
    title: '已完成订单里金额在 3 万到 4 万之间的',
    schema: 'shop',
    tags: ['复合索引', '范围查询'],
    description:
      'orders 上有一个复合索引 (status, total_amount)。状态用等值、金额用范围，正好能把这个索引的两列都用上。',
    requirements: ['输出 2 列：id、total_amount', '状态为 completed，且 total_amount 在 30000 到 40000 之间（含两端）', '顺序不限'],
    expectedColumns: ['id', 'total_amount'],
    reference: `SELECT id, total_amount
FROM orders
WHERE status = 'completed'
  AND total_amount BETWEEN 30000 AND 40000`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 3000, note: '复合索引 (status, total_amount) 可用时只扫约 1000 行' },
    solutions: [
      {
        label: '等值 + 范围，两列都用上',
        sql: `SELECT id, total_amount FROM orders WHERE status = 'completed' AND total_amount BETWEEN 30000 AND 40000`,
        note: '复合索引先按 status 排、再按 total_amount 排。status 等值定位到一段，total_amount 的范围就在这段里继续缩小，两列都用上了。',
      },
      {
        label: '错误示范：金额列上做运算',
        sql: `SELECT id, total_amount FROM orders WHERE status = 'completed' AND total_amount + 0 BETWEEN 30000 AND 40000`,
        note: 'status 还能用上索引，但金额这一列失效了，只能在 2.8 万条已完成订单里逐行算。索引只用了半截，效果大打折扣。',
        slow: true,
      },
    ],
    followups: [
      '为什么 (status, total_amount) 索引里，status 用等值、total_amount 用范围是最理想的组合？',
      '如果把条件反过来（total_amount 等值、status 范围），还能两列都用上吗？',
      '这条查询需要回表吗？只查 id 和 total_amount 的话能不能不回表？',
    ],
  },

  {
    id: 'idx-06',
    module: '索引与执行计划',
    difficulty: 2,
    title: '薪资在 6 万到 6.5 万之间的员工',
    schema: 'company',
    tags: ['范围查询', 'range', '函数'],
    description:
      '薪资列上有索引。查一个薪资区间，正常写法是 range 扫描；但如果在列上套一个 ROUND，就变成全表扫。',
    requirements: ['输出 3 列：id、name、salary', '只保留 salary 在 60000 到 65000 之间（含两端）的员工', '顺序不限'],
    expectedColumns: ['id', 'name', 'salary'],
    reference: `SELECT id, name, salary
FROM employees
WHERE salary BETWEEN 60000 AND 65000`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 500, note: 'salary 索引可用时只扫约 110 行' },
    solutions: [
      {
        label: '直接对列做范围比较',
        sql: `SELECT id, name, salary FROM employees WHERE salary BETWEEN 60000 AND 65000`,
        note: '范围条件写在裸列上，索引能定位到区间的起点然后顺序读，访问方式是 range。',
      },
      {
        label: '错误示范：ROUND 包住列',
        sql: `SELECT id, name, salary FROM employees WHERE ROUND(salary, 0) BETWEEN 60000 AND 65000`,
        note: '这里 ROUND(salary, 0) 对 DECIMAL(10,2) 的结果其实没变化，但优化器不认，索引失效，5000 行全扫。只要列上出现函数，索引就用不了。',
        slow: true,
      },
    ],
    followups: [
      'BETWEEN 是闭区间还是开区间？和 >= AND <= 等价吗？',
      '为什么"列上出现函数"会让索引失效？从 B+ 树的结构解释一下。',
      '如果确实需要按"四舍五入后的薪资"分组统计，怎么兼顾正确性和性能？',
    ],
  },

  {
    id: 'idx-07',
    module: '索引与执行计划',
    difficulty: 3,
    title: '某一天已完成的订单',
    schema: 'shop',
    tags: ['日期范围', '复合索引', '索引选择'],
    description:
      '同时有状态和日期两个条件。orders 上既有 (status, order_date) 也有 (order_date)，优化器会挑一个更划算的。关键是别把日期列包进函数，否则只剩状态能用。',
    requirements: ['输出 3 列：id、customer_id、total_amount', '状态为 completed，下单时间在 2025-01-15 当天', '顺序不限'],
    expectedColumns: ['id', 'customer_id', 'total_amount'],
    reference: `SELECT id, customer_id, total_amount
FROM orders
WHERE status = 'completed'
  AND order_date >= '2025-01-15 00:00:00'
  AND order_date < '2025-01-16 00:00:00'`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 500, note: '两个条件都走索引时只扫约 30 行' },
    solutions: [
      {
        label: '状态等值 + 日期区间',
        sql: `SELECT id, customer_id, total_amount FROM orders WHERE status = 'completed' AND order_date >= '2025-01-15 00:00:00' AND order_date < '2025-01-16 00:00:00'`,
        note: '两个条件都是裸列比较，(status, order_date) 索引能一次定位到"已完成 + 这一天"这个很窄的区间。',
      },
      {
        label: '错误示范：DATE() 包住日期列',
        sql: `SELECT id, customer_id, total_amount FROM orders WHERE status = 'completed' AND DATE(order_date) = '2025-01-15'`,
        note: 'DATE(order_date) = ... 让日期部分彻底失效，只能用 status 定位到 2.8 万条已完成订单，再逐行算 DATE() 过滤。慢了三个数量级。',
        slow: true,
      },
    ],
    followups: [
      'MySQL 在多个可用索引之间是怎么选的？靠什么统计信息？',
      '如果状态值只有 4 种，索引的选择性高吗？这种情况下优化器会怎么权衡？',
      '为什么 DATE(order_date) = ... 不能用索引，而 order_date >= ... AND < ... 可以？',
    ],
  },

  {
    id: 'idx-08',
    module: '索引与执行计划',
    difficulty: 3,
    title: '订单号在 1000 到 1100 之间的明细',
    schema: 'shop',
    tags: ['范围查询', '主键', 'sargable'],
    description:
      'order_items 上 order_id 有索引。查一个订单号区间的明细，走 range 只碰两百行；一旦在列上做运算，就是 10 万行全扫。',
    requirements: ['输出 3 列：order_id、qty、unit_price', '只保留 order_id 在 1000 到 1100 之间（含两端）的明细', '顺序不限'],
    expectedColumns: ['order_id', 'qty', 'unit_price'],
    reference: `SELECT order_id, qty, unit_price
FROM order_items
WHERE order_id BETWEEN 1000 AND 1100`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 2000, note: 'order_id 索引可用时只扫约 200 行' },
    solutions: [
      {
        label: '范围条件写在裸列上',
        sql: `SELECT order_id, qty, unit_price FROM order_items WHERE order_id BETWEEN 1000 AND 1100`,
        note: '范围查询走 range，从区间的起点开始顺序读，读完就停，不会碰区间外的数据。',
      },
      {
        label: '错误示范：算术运算包住列',
        sql: `SELECT order_id, qty, unit_price FROM order_items WHERE order_id + 0 BETWEEN 1000 AND 1100`,
        note: 'order_id + 0 恒等于 order_id，但优化器看不出这一点，索引直接失效，10 万行全扫。这类"无意义运算"常见于动态拼接 SQL 的代码里。',
        slow: true,
      },
    ],
    followups: [
      'BETWEEN 和 IN 在索引使用上有什么区别？范围很大时呢？',
      '这条查询如果要按 order_id 排序输出，需要额外排序吗？',
      '如果 order_id 区间跨越了 80% 的数据，优化器还会走索引吗？为什么？',
    ],
  },

  {
    id: 'idx-09',
    module: '索引与执行计划',
    difficulty: 3,
    title: '3 号部门里薪资高于 4 万的员工',
    schema: 'company',
    tags: ['索引选择', '多条件', '选择性'],
    description:
      'dept_id 和 salary 上各有一个单列索引。两个条件同时存在时，优化器只会挑其中一个用，另一个只能逐行过滤。这题能看出"两个单列索引 ≠ 一个复合索引"。',
    requirements: ['输出 3 列：id、name、salary', '只保留 dept_id = 3 且 salary > 40000 的员工', '顺序不限'],
    expectedColumns: ['id', 'name', 'salary'],
    reference: `SELECT id, name, salary
FROM employees
WHERE dept_id = 3 AND salary > 40000`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: { maxRowsExamined: 800, note: '用 idx_emp_dept 定位到部门再过滤薪资，扫约 400 行' },
    solutions: [
      {
        label: '两个裸列条件',
        sql: `SELECT id, name, salary FROM employees WHERE dept_id = 3 AND salary > 40000`,
        note: '优化器通常会选 dept_id 索引（部门只有 400 多人），把整个部门捞出来再逐行比薪资。想看它到底选了哪个，点"执行计划"。',
      },
      {
        label: '错误示范：部门列做运算',
        sql: `SELECT id, name, salary FROM employees WHERE dept_id + 0 = 3 AND salary > 40000`,
        note: '部门索引失效，只剩 salary 索引可用。薪资 > 4 万的人比整个部门还多，反而扫得更多——索引用错比不用还糟。',
        slow: true,
      },
    ],
    followups: [
      '如果想两个条件都走索引，索引该怎么建？',
      '为什么说"两个单列索引不等于一个复合索引"？',
      'dept_id 只有 12 个不同值，这种低选择性列适合单独建索引吗？',
    ],
  },

  {
    id: 'idx-10',
    module: '索引与执行计划',
    difficulty: 3,
    title: '统计 2025 年每个月的订单数',
    schema: 'shop',
    tags: ['时间分组', 'sargable', 'GROUP BY'],
    description:
      '按月统计是报表的日常操作。关键区别在于：GROUP BY 里用 DATE_FORMAT 完全没问题，但 WHERE 里用 YEAR() 就会把索引废掉——两个地方长得像，代价完全不同。',
    requirements: ['输出 2 列：month、cnt', '只统计 2025 年的订单，month 格式为 YYYY-MM', '按 month 升序'],
    expectedColumns: ['month', 'cnt'],
    reference: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS cnt
FROM orders
WHERE order_date >= '2025-01-01' AND order_date < '2026-01-01'
GROUP BY month
ORDER BY month`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: { maxRowsExamined: 30000, note: 'WHERE 用日期区间可走 range 只扫 2025 年约 2.5 万行；用 YEAR() 则全表 5 万行' },
    solutions: [
      {
        label: 'WHERE 用区间，GROUP BY 用函数',
        sql: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS cnt FROM orders WHERE order_date >= '2025-01-01' AND order_date < '2026-01-01' GROUP BY month ORDER BY month`,
        note: 'WHERE 负责"圈出 2025 年"，必须用裸列区间才能走索引；GROUP BY 负责"切成 12 个月"，这里用函数没问题，因为只需要对筛完的 2.5 万行算。',
      },
      {
        label: '错误示范：WHERE 里用 YEAR()',
        sql: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS cnt FROM orders WHERE YEAR(order_date) = 2025 GROUP BY month ORDER BY month`,
        note: '结果完全一样，但 YEAR(order_date) 让索引失效，5 万行全部算一遍年份再筛。这就是"同样的结果，十倍的代价"。',
        slow: true,
      },
    ],
    followups: [
      '为什么 GROUP BY 里用函数不影响索引使用，WHERE 里用就有问题？',
      '如果要统计"最近 12 个月"，WHERE 条件怎么写才能既正确又走索引？',
      '这张表上已经有 (order_date) 索引，统计全年时优化器为什么可能不用它？',
    ],
  },
];
