// 模块 5：经典面试题
export const INTERVIEW = [
  {
    id: 'int-01',
    module: '经典面试题',
    difficulty: 3,
    title: '连续登录 3 天以上的用户',
    schema: 'shop',
    tags: ['连续问题', 'gaps and islands', 'ROW_NUMBER'],
    description:
      '登录日志里每个用户有多条记录，要找出"连续登录至少 3 天"的连续段。这是 SQL 面试出现频率最高的一道题，核心技巧是"日期减去行号"——同一段连续日期减完会得到同一个值。',
    requirements: ['输出 4 列：customer_id、start_date、end_date、days', '每段连续登录各占一行，days 是这段连续天数', '只保留 days >= 3 的段', '按 days 降序、customer_id 升序、start_date 升序', '取前 30 行'],
    expectedColumns: ['customer_id', 'start_date', 'end_date', 'days'],
    reference: `WITH t AS (
  SELECT customer_id, login_date,
         DATE_SUB(login_date,
           INTERVAL ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date) DAY) AS grp
  FROM login_log
), s AS (
  SELECT customer_id, grp,
         MIN(login_date) AS start_date,
         MAX(login_date) AS end_date,
         COUNT(*) AS days
  FROM t
  GROUP BY customer_id, grp
)
SELECT customer_id, start_date, end_date, days
FROM s
WHERE days >= 3
ORDER BY days DESC, customer_id, start_date
LIMIT 30`,
    ordered: true,
    roundTo: null,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '日期减行号分组（标准解法）',
        sql: `WITH t AS (SELECT customer_id, login_date, DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date) DAY) AS grp FROM login_log), s AS (SELECT customer_id, grp, MIN(login_date) AS start_date, MAX(login_date) AS end_date, COUNT(*) AS days FROM t GROUP BY customer_id, grp) SELECT customer_id, start_date, end_date, days FROM s WHERE days >= 3 ORDER BY days DESC, customer_id, start_date LIMIT 30`,
        note: '连续日期减去递增行号，结果是一个固定值；一旦日期断了，这个值就会跳一下。所以"减出来的值相同"就等于"属于同一段连续"。',
      },
      {
        label: '先按天聚合再判断',
        sql: `WITH t AS (SELECT customer_id, login_date, DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date) DAY) AS grp FROM login_log) SELECT customer_id, MIN(login_date) AS start_date, MAX(login_date) AS end_date, COUNT(*) AS days FROM t GROUP BY customer_id, grp HAVING COUNT(*) >= 3 ORDER BY days DESC, customer_id, start_date LIMIT 30`,
        note: '同一个思路的紧凑版：把过滤条件从外层 WHERE 挪进 HAVING，少套一层 CTE。',
      },
    ],
    followups: [
      '为什么"日期减行号"能识别连续？请用具体日期举例说明。',
      '如果同一个人一天登录了两次，这个写法会出问题吗？怎么先按天去重？',
      '如果要求"连续登录 3 天且这 3 天都有下单"，SQL 怎么改？',
    ],
  },

  {
    id: 'int-02',
    module: '经典面试题',
    difficulty: 3,
    title: '每个用户最长连续登录了几天',
    schema: 'shop',
    tags: ['连续问题', 'gaps and islands', 'MAX'],
    description: '还是连续登录，但这次不要明细，只要每个人"最长的那一段有多长"。相当于在上题的结果上再取一次最大值。',
    requirements: ['输出 2 列：customer_id、max_days', '每个用户一行，max_days 是其最长连续登录天数', '按 max_days 降序、customer_id 升序', '取前 20 行'],
    expectedColumns: ['customer_id', 'max_days'],
    reference: `WITH t AS (
  SELECT customer_id, login_date,
         DATE_SUB(login_date,
           INTERVAL ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date) DAY) AS grp
  FROM login_log
), s AS (
  SELECT customer_id, grp, COUNT(*) AS days
  FROM t
  GROUP BY customer_id, grp
)
SELECT customer_id, MAX(days) AS max_days
FROM s
GROUP BY customer_id
ORDER BY max_days DESC, customer_id
LIMIT 20`,
    ordered: true,
    roundTo: null,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '两段聚合',
        sql: `WITH t AS (SELECT customer_id, login_date, DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date) DAY) AS grp FROM login_log), s AS (SELECT customer_id, grp, COUNT(*) AS days FROM t GROUP BY customer_id, grp) SELECT customer_id, MAX(days) AS max_days FROM s GROUP BY customer_id ORDER BY max_days DESC, customer_id LIMIT 20`,
        note: '第一步把连续段切出来并数长度，第二步按人取最大值。连续题几乎都是这个两层结构。',
      },
      {
        label: '用 RANK 替代 ROW_NUMBER',
        sql: `WITH t AS (SELECT customer_id, login_date, DATE_SUB(login_date, INTERVAL RANK() OVER (PARTITION BY customer_id ORDER BY login_date) DAY) AS grp FROM login_log), s AS (SELECT customer_id, grp, COUNT(*) AS days FROM t GROUP BY customer_id, grp) SELECT customer_id, MAX(days) AS max_days FROM s GROUP BY customer_id ORDER BY max_days DESC, customer_id LIMIT 20`,
        note: '因为每人每天最多一条记录，RANK 和 ROW_NUMBER 在这里结果一样。如果一天可能有多条，RANK 会给出相同名次，反而能起到"按天去重"的作用。',
      },
    ],
    followups: [
      '为什么这里用 RANK 和 ROW_NUMBER 结果一样？',
      '如果想统计"连续登录 ≥ 7 天的人数"，怎么在这个基础上改？',
      '如果一天可能有多条登录记录，ROW_NUMBER 会算错吗？怎么修？',
    ],
  },

  {
    id: 'int-03',
    module: '经典面试题',
    difficulty: 3,
    title: '次日留存率',
    schema: 'shop',
    tags: ['留存率', 'EXISTS', '首次行为'],
    description:
      '次日留存 = "今天第一次来的用户里，第二天又来了的比例"。先找出每个人的首次登录日期，再看第二天有没有再来。这是产品分析里最核心的一个指标。',
    requirements: ['输出 3 列：new_users、retained_users、rate', 'new_users 是有登录记录的用户总数', 'retained_users 是首次登录次日又登录的用户数', 'rate 是百分比，保留 2 位小数', '只返回 1 行'],
    expectedColumns: ['new_users', 'retained_users', 'rate'],
    reference: `WITH f AS (
  SELECT customer_id, MIN(login_date) AS d0
  FROM login_log
  GROUP BY customer_id
), r AS (
  SELECT f.customer_id, f.d0,
         EXISTS (SELECT 1 FROM login_log l
                 WHERE l.customer_id = f.customer_id
                   AND l.login_date = DATE_ADD(f.d0, INTERVAL 1 DAY)) AS retained
  FROM f
)
SELECT COUNT(*) AS new_users,
       SUM(retained) AS retained_users,
       ROUND(SUM(retained) * 100 / COUNT(*), 2) AS rate
FROM r`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '首次日期 + EXISTS 判断次日',
        sql: `WITH f AS (SELECT customer_id, MIN(login_date) AS d0 FROM login_log GROUP BY customer_id), r AS (SELECT f.customer_id, f.d0, EXISTS (SELECT 1 FROM login_log l WHERE l.customer_id = f.customer_id AND l.login_date = DATE_ADD(f.d0, INTERVAL 1 DAY)) AS retained FROM f) SELECT COUNT(*) AS new_users, SUM(retained) AS retained_users, ROUND(SUM(retained) * 100 / COUNT(*), 2) AS rate FROM r`,
        note: 'EXISTS 返回的是布尔值，MySQL 里可以直接当 1/0 求和。比 COUNT(*) 套子查询再除更简洁。',
      },
      {
        label: '用 JOIN 判断次日是否登录',
        sql: `WITH f AS (SELECT customer_id, MIN(login_date) AS d0 FROM login_log GROUP BY customer_id) SELECT COUNT(*) AS new_users, COUNT(l.customer_id) AS retained_users, ROUND(COUNT(l.customer_id) * 100 / COUNT(*), 2) AS rate FROM f LEFT JOIN login_log l ON l.customer_id = f.customer_id AND l.login_date = DATE_ADD(f.d0, INTERVAL 1 DAY)`,
        note: '左连接后数右表：连上说明次日来过，没连上是 NULL，COUNT 会跳过。和 EXISTS 版结果一样，思路更"表连接"。',
      },
    ],
    followups: [
      '留存率的分母为什么是"首次登录的用户"，而不是"当天所有活跃用户"？',
      '如果要算"第 7 日留存"，条件应该怎么写？',
      '次日留存 30% 算高还是低？它和业务类型有什么关系？',
    ],
  },

  {
    id: 'int-04',
    module: '经典面试题',
    difficulty: 4,
    title: '按首次登录月份看次日留存',
    schema: 'shop',
    tags: ['留存率', '同期群', 'cohort'],
    description:
      '把用户按"首次登录月份"分成若干批（同期群），每一批单独算次日留存。这是留存分析的标配表格，能看出"新用户质量有没有变差"。',
    requirements: ['输出 4 列：cohort、new_users、retained_users、rate', 'cohort 是首次登录的年月（YYYY-MM）', 'rate 保留 2 位小数', '按 cohort 升序'],
    expectedColumns: ['cohort', 'new_users', 'retained_users', 'rate'],
    reference: `WITH f AS (
  SELECT customer_id, MIN(login_date) AS d0
  FROM login_log
  GROUP BY customer_id
), r AS (
  SELECT DATE_FORMAT(f.d0, '%Y-%m') AS cohort,
         EXISTS (SELECT 1 FROM login_log l
                 WHERE l.customer_id = f.customer_id
                   AND l.login_date = DATE_ADD(f.d0, INTERVAL 1 DAY)) AS retained
  FROM f
)
SELECT cohort,
       COUNT(*) AS new_users,
       SUM(retained) AS retained_users,
       ROUND(SUM(retained) * 100 / COUNT(*), 2) AS rate
FROM r
GROUP BY cohort
ORDER BY cohort`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '先算人，再按月聚合',
        sql: `WITH f AS (SELECT customer_id, MIN(login_date) AS d0 FROM login_log GROUP BY customer_id), r AS (SELECT DATE_FORMAT(f.d0, '%Y-%m') AS cohort, EXISTS (SELECT 1 FROM login_log l WHERE l.customer_id = f.customer_id AND l.login_date = DATE_ADD(f.d0, INTERVAL 1 DAY)) AS retained FROM f) SELECT cohort, COUNT(*) AS new_users, SUM(retained) AS retained_users, ROUND(SUM(retained) * 100 / COUNT(*), 2) AS rate FROM r GROUP BY cohort ORDER BY cohort`,
        note: '关键在顺序：先按人算出"是否留存"这个 0/1 标记，再按月份汇总。如果反过来先按月分组，就没法判断"某个人次日有没有来"了。',
      },
      {
        label: '用 CASE 代替布尔求和',
        sql: `WITH f AS (SELECT customer_id, MIN(login_date) AS d0 FROM login_log GROUP BY customer_id) SELECT DATE_FORMAT(f.d0, '%Y-%m') AS cohort, COUNT(*) AS new_users, SUM(CASE WHEN l.customer_id IS NULL THEN 0 ELSE 1 END) AS retained_users, ROUND(SUM(CASE WHEN l.customer_id IS NULL THEN 0 ELSE 1 END) * 100 / COUNT(*), 2) AS rate FROM f LEFT JOIN login_log l ON l.customer_id = f.customer_id AND l.login_date = DATE_ADD(f.d0, INTERVAL 1 DAY) GROUP BY DATE_FORMAT(f.d0, '%Y-%m') ORDER BY cohort`,
        note: 'CASE 写法更啰嗦但可移植性好，PostgreSQL、Oracle 都能跑。布尔求和是 MySQL 的方言便利。',
      },
    ],
    followups: [
      '为什么必须"先按人算标记，再按月聚合"？顺序反过来会错在哪？',
      '同期群分析除了留存，还能用来回答哪些业务问题？',
      '如果某个 cohort 的人数特别少，这个留存率还能直接用吗？',
    ],
  },

  {
    id: 'int-05',
    module: '经典面试题',
    difficulty: 4,
    title: '订单金额的 P50 / P90 / P99',
    schema: 'shop',
    tags: ['分位数', 'PERCENT_RANK'],
    description:
      '分位数比平均值更能反映真实分布：P50 是中位数，P90 说明"90% 的订单都比它便宜"。用 PERCENT_RANK 给每笔订单算累计百分位，再取最接近的那一档。',
    requirements: ['输出 3 列：p50、p90、p99', '分别代表订单金额的第 50、90、99 百分位，保留 2 位小数', '只返回 1 行'],
    expectedColumns: ['p50', 'p90', 'p99'],
    reference: `WITH t AS (
  SELECT total_amount, PERCENT_RANK() OVER (ORDER BY total_amount) AS pr
  FROM orders
)
SELECT ROUND(MIN(CASE WHEN pr >= 0.5  THEN total_amount END), 2) AS p50,
       ROUND(MIN(CASE WHEN pr >= 0.9  THEN total_amount END), 2) AS p90,
       ROUND(MIN(CASE WHEN pr >= 0.99 THEN total_amount END), 2) AS p99
FROM t`,
    ordered: false,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'PERCENT_RANK + 条件聚合',
        sql: `WITH t AS (SELECT total_amount, PERCENT_RANK() OVER (ORDER BY total_amount) AS pr FROM orders) SELECT ROUND(MIN(CASE WHEN pr >= 0.5 THEN total_amount END), 2) AS p50, ROUND(MIN(CASE WHEN pr >= 0.9 THEN total_amount END), 2) AS p90, ROUND(MIN(CASE WHEN pr >= 0.99 THEN total_amount END), 2) AS p99 FROM t`,
        note: 'PERCENT_RANK 给出"这行在整体里处于第几百分位"。先算出所有行的百分位，再用条件聚合挑出跨过每个分位点的那一笔金额。',
      },
      {
        label: '派生表 + 条件聚合',
        sql: `SELECT ROUND(MIN(CASE WHEN pr >= 0.5 THEN amt END), 2) AS p50, ROUND(MIN(CASE WHEN pr >= 0.9 THEN amt END), 2) AS p90, ROUND(MIN(CASE WHEN pr >= 0.99 THEN amt END), 2) AS p99 FROM (SELECT total_amount AS amt, PERCENT_RANK() OVER (ORDER BY total_amount) AS pr FROM orders) t`,
        note: '把 CTE 换成派生表，逻辑一样。要留意：分位数没有全球统一的定义，换成 CUME_DIST 或按行号估算，边界上可能差一笔金额——面试时先说清你用的是哪种口径。',
      },
    ],
    followups: [
      'P90 和"前 10% 的平均值"是一回事吗？',
      '为什么分位数比平均值更能反映真实情况？举个反例。',
      '如果要按"每个月"分别算 P90，SQL 怎么改？',
    ],
  },

  {
    id: 'int-06',
    module: '经典面试题',
    difficulty: 3,
    title: '哪些客户这次比上次花得多',
    schema: 'shop',
    tags: ['LAG', '分区', '过滤'],
    description:
      '把每个客户的订单按时间排好，比较这一单和上一单的金额，只留下"这次花得更多"的记录。LAG 取上一行，再配一个 WHERE 过滤。',
    requirements: ['输出 5 列：customer_id、order_id、prev_amount、total_amount、diff', 'prev_amount 是该客户上一单的金额，diff = total_amount - prev_amount', '只保留 total_amount > prev_amount 的记录', '按 diff 降序、customer_id 升序、order_id 升序', '取前 30 行'],
    expectedColumns: ['customer_id', 'order_id', 'prev_amount', 'total_amount', 'diff'],
    reference: `WITH t AS (
  SELECT customer_id, id AS order_id, order_date, total_amount,
         LAG(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date, id) AS prev_amount
  FROM orders
)
SELECT customer_id, order_id, prev_amount, total_amount,
       ROUND(total_amount - prev_amount, 2) AS diff
FROM t
WHERE prev_amount IS NOT NULL AND total_amount > prev_amount
ORDER BY diff DESC, customer_id, order_id
LIMIT 30`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'LAG 后过滤',
        sql: `WITH t AS (SELECT customer_id, id AS order_id, order_date, total_amount, LAG(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date, id) AS prev_amount FROM orders) SELECT customer_id, order_id, prev_amount, total_amount, ROUND(total_amount - prev_amount, 2) AS diff FROM t WHERE prev_amount IS NOT NULL AND total_amount > prev_amount ORDER BY diff DESC, customer_id, order_id LIMIT 30`,
        note: '注意窗口函数先算完，外层 WHERE 才能用它的结果——所以必须先包一层 CTE，不能把 LAG 直接写进 WHERE。',
      },
      {
        label: '自连接找上一单',
        sql: `SELECT o.customer_id, o.id AS order_id, p.total_amount AS prev_amount, o.total_amount, ROUND(o.total_amount - p.total_amount, 2) AS diff FROM orders o JOIN orders p ON p.customer_id = o.customer_id AND (p.order_date < o.order_date OR (p.order_date = o.order_date AND p.id < o.id)) WHERE p.id = (SELECT p2.id FROM orders p2 WHERE p2.customer_id = o.customer_id AND (p2.order_date < o.order_date OR (p2.order_date = o.order_date AND p2.id < o.id)) ORDER BY p2.order_date DESC, p2.id DESC LIMIT 1) AND o.total_amount > p.total_amount ORDER BY diff DESC, o.customer_id, o.id LIMIT 30`,
        note: '不用窗口函数的老写法。能跑，但"找上一条"的逻辑要自己写，而且相关子查询会让它慢一个量级。',
      },
    ],
    followups: [
      '为什么 WHERE 里不能直接用 LAG(...)？',
      '第一单的 prev_amount 是 NULL，为什么必须过滤掉？不过滤会怎样？',
      '想算"每个客户的平均单笔涨幅"，怎么在这个基础上继续？',
    ],
  },

  {
    id: 'int-07',
    module: '经典面试题',
    difficulty: 2,
    title: '行转列：每月各状态的订单数',
    schema: 'shop',
    tags: ['行转列', '条件聚合', '透视'],
    description:
      '原始数据是"一行一个订单"，要变成"一行一个月份、每种状态各占一列"。这就是 Excel 里的数据透视表，SQL 里靠条件聚合实现。',
    requirements: ['输出 5 列：month、completed、pending、cancelled、refunded', 'month 为 YYYY-MM，统计全部年份', '四个状态列分别是该月该状态的订单数，没有则记 0', '按 month 升序'],
    expectedColumns: ['month', 'completed', 'pending', 'cancelled', 'refunded'],
    reference: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN status = 'refunded'  THEN 1 ELSE 0 END) AS refunded
FROM orders
GROUP BY month
ORDER BY month`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'SUM(CASE WHEN) 透视',
        sql: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) AS refunded FROM orders GROUP BY month ORDER BY month`,
        note: '每个状态写一个条件聚合，就得到一列。列数固定时这是最稳的写法，所有数据库都支持。',
      },
      {
        label: '先分组再自连接',
        sql: `SELECT a.ym AS month, COALESCE(b.cnt, 0) AS completed, COALESCE(c.cnt, 0) AS pending, COALESCE(d.cnt, 0) AS cancelled, COALESCE(e.cnt, 0) AS refunded FROM (SELECT DISTINCT DATE_FORMAT(order_date, '%Y-%m') AS ym FROM orders) a LEFT JOIN (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM orders WHERE status = 'completed' GROUP BY ym) b ON b.ym = a.ym LEFT JOIN (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM orders WHERE status = 'pending' GROUP BY ym) c ON c.ym = a.ym LEFT JOIN (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM orders WHERE status = 'cancelled' GROUP BY ym) d ON d.ym = a.ym LEFT JOIN (SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM orders WHERE status = 'refunded' GROUP BY ym) e ON e.ym = a.ym ORDER BY a.ym`,
        note: '每个状态各查一次再拼起来。能跑，但扫了四遍表、写起来也长——这正是条件聚合要解决的问题。',
      },
    ],
    followups: [
      '如果状态种类不固定（随时可能新增），这种写法有什么问题？该怎么处理？',
      'SUM(CASE WHEN ... THEN 1 ELSE 0 END) 能不能简化成 SUM(status = \'completed\')？有什么可移植性代价？',
      '行转列和 GROUP BY 的关系是什么？',
    ],
  },

  {
    id: 'int-08',
    module: '经典面试题',
    difficulty: 2,
    title: '行转列：每个城市各等级客户数',
    schema: 'shop',
    tags: ['行转列', '条件聚合'],
    description: '把会员等级横过来变成列，每个城市一行。和上一题同一个套路，换一张表再练一遍。',
    requirements: ['输出 5 列：city、normal、silver、gold、diamond', '四列分别对应 普通/白银/黄金/钻石 的客户数', '按 city 升序'],
    expectedColumns: ['city', 'normal', 'silver', 'gold', 'diamond'],
    reference: `SELECT city,
       SUM(CASE WHEN level = '普通' THEN 1 ELSE 0 END) AS normal,
       SUM(CASE WHEN level = '白银' THEN 1 ELSE 0 END) AS silver,
       SUM(CASE WHEN level = '黄金' THEN 1 ELSE 0 END) AS gold,
       SUM(CASE WHEN level = '钻石' THEN 1 ELSE 0 END) AS diamond
FROM customers
GROUP BY city
ORDER BY city`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'SUM(CASE WHEN)',
        sql: `SELECT city, SUM(CASE WHEN level = '普通' THEN 1 ELSE 0 END) AS normal, SUM(CASE WHEN level = '白银' THEN 1 ELSE 0 END) AS silver, SUM(CASE WHEN level = '黄金' THEN 1 ELSE 0 END) AS gold, SUM(CASE WHEN level = '钻石' THEN 1 ELSE 0 END) AS diamond FROM customers GROUP BY city ORDER BY city`,
        note: '和上一题完全同构。判断"要不要用条件聚合"的标准很简单：结果里既有"分组维度"又有"分组内的分类"，就适合。',
      },
      {
        label: 'COUNT(CASE WHEN)',
        sql: `SELECT city, COUNT(CASE WHEN level = '普通' THEN 1 END) AS normal, COUNT(CASE WHEN level = '白银' THEN 1 END) AS silver, COUNT(CASE WHEN level = '黄金' THEN 1 END) AS gold, COUNT(CASE WHEN level = '钻石' THEN 1 END) AS diamond FROM customers GROUP BY city ORDER BY city`,
        note: 'COUNT 只数非 NULL，所以这里要省略 ELSE（或写 ELSE NULL）。写成 ELSE 0 会把所有客户都数进去，四列全变成总人数。',
      },
    ],
    followups: [
      'COUNT(CASE WHEN ... ELSE 0 END) 会得到什么结果？为什么？',
      '想再加一列"合计"，SQL 怎么写？',
      '除了会员等级，还有哪些场景适合行转列？',
    ],
  },

  {
    id: 'int-09',
    module: '经典面试题',
    difficulty: 3,
    title: '订单金额的中位数',
    schema: 'shop',
    tags: ['中位数', 'ROW_NUMBER'],
    description:
      '5 万笔订单的中位数是多少？MySQL 没有 MEDIAN 函数，要用"排序 + 取中间行"的思路自己做。偶数行时取中间两行的平均。',
    requirements: ['输出 1 列：median', '保留 2 位小数，行数为偶数时取中间两行的平均', '只返回 1 行'],
    expectedColumns: ['median'],
    reference: `WITH t AS (
  SELECT total_amount,
         ROW_NUMBER() OVER (ORDER BY total_amount, id) AS rn,
         COUNT(*)     OVER () AS n
  FROM orders
)
SELECT ROUND(AVG(total_amount), 2) AS median
FROM t
WHERE rn IN (FLOOR((n + 1) / 2), CEIL((n + 1) / 2))`,
    ordered: false,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '取中间一行或两行',
        sql: `WITH t AS (SELECT total_amount, ROW_NUMBER() OVER (ORDER BY total_amount, id) AS rn, COUNT(*) OVER () AS n FROM orders) SELECT ROUND(AVG(total_amount), 2) AS median FROM t WHERE rn IN (FLOOR((n + 1) / 2), CEIL((n + 1) / 2))`,
        note: '5 万是偶数，FLOOR 和 CEIL 会给出 25000 和 25001 两个位置，AVG 自动变成两者的平均。奇数时两个位置相同，取到的就是正中间那一行。',
      },
      {
        label: 'BETWEEN 取中间区间',
        sql: `WITH t AS (SELECT total_amount, ROW_NUMBER() OVER (ORDER BY total_amount, id) AS rn, COUNT(*) OVER () AS n FROM orders) SELECT ROUND(AVG(total_amount), 2) AS median FROM t WHERE rn BETWEEN FLOOR((n + 1) / 2) AND CEIL((n + 1) / 2)`,
        note: '和 IN 版本完全等价，只是把"两个位置"表达成一个区间。行数是奇数时区间只有一行，偶数时正好两行。',
      },
    ],
    followups: [
      '中位数和平均值哪个更能代表"典型订单金额"？为什么？',
      '订单金额分布是右偏的（少数大单拉高平均），这对业务判断有什么影响？',
      '如果要算"每个客户订单金额的中位数"，怎么改？',
    ],
  },

  {
    id: 'int-10',
    module: '经典面试题',
    difficulty: 3,
    title: '销售额前 10 的商品占多少',
    schema: 'shop',
    tags: ['TopN', '占比', '窗口'],
    description:
      '先算出每个商品的总销售额，排名后取前 10，再算这 10 个商品占全部销售额的百分比。TopN + 占比是运营分析的标准组合。',
    requirements: ['输出 5 列：rn、id、name、amount、pct', 'rn 是销售额排名，amount 保留 2 位小数，pct 是占全部销售额的百分比（保留 2 位小数）', '只取前 10 名', '按 rn 升序'],
    expectedColumns: ['rn', 'id', 'name', 'amount', 'pct'],
    reference: `WITH s AS (
  SELECT p.id, p.name, ROUND(SUM(oi.qty * oi.unit_price), 2) AS amount
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  GROUP BY p.id, p.name
), r AS (
  SELECT s.id, s.name, s.amount,
         ROW_NUMBER() OVER (ORDER BY s.amount DESC, s.id) AS rn,
         SUM(s.amount) OVER () AS total
  FROM s
)
SELECT rn, id, name, amount, ROUND(amount * 100 / total, 2) AS pct
FROM r
WHERE rn <= 10
ORDER BY rn`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '先聚合再排名，最后算占比',
        sql: `WITH s AS (SELECT p.id, p.name, ROUND(SUM(oi.qty * oi.unit_price), 2) AS amount FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.id, p.name), r AS (SELECT s.id, s.name, s.amount, ROW_NUMBER() OVER (ORDER BY s.amount DESC, s.id) AS rn, SUM(s.amount) OVER () AS total FROM s) SELECT rn, id, name, amount, ROUND(amount * 100 / total, 2) AS pct FROM r WHERE rn <= 10 ORDER BY rn`,
        note: '三步不能合并：先在 10 万行明细上聚合、再在 500 行结果上排名、最后算占比。每步处理的数据量差好几个数量级。',
      },
      {
        label: '用子查询取总额',
        sql: `WITH s AS (SELECT p.id, p.name, ROUND(SUM(oi.qty * oi.unit_price), 2) AS amount FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.id, p.name) SELECT ROW_NUMBER() OVER (ORDER BY s.amount DESC, s.id) AS rn, s.id, s.name, s.amount, ROUND(s.amount * 100 / (SELECT SUM(amount) FROM s), 2) AS pct FROM s ORDER BY rn LIMIT 10`,
        note: '总额用标量子查询取，排名放在最外层 SELECT 里。能跑，但同一层里既有窗口函数又有 LIMIT，读起来不如 CTE 版清楚。',
      },
    ],
    followups: [
      '前 10 名加起来占多少？这个比例说明什么问题？',
      '如果要按"每个类目内的前 3 名"，PARTITION BY 加在哪？',
      '销售额排名和销量排名为什么可能不一样？',
    ],
  },

  {
    id: 'int-11',
    module: '经典面试题',
    difficulty: 2,
    title: '复购率',
    schema: 'shop',
    tags: ['复购', '占比', 'HAVING'],
    description:
      '复购率 = "下过 2 单及以上的客户" ÷ "下过单的客户"。注意分母只算下过单的人，从没下单的客户不属于"复购"讨论范围。',
    requirements: ['输出 3 列：buyers、repeat_buyers、repeat_rate', 'buyers 是下过单的客户数，repeat_buyers 是订单数 >= 2 的客户数', 'repeat_rate 是百分比，保留 2 位小数', '只返回 1 行'],
    expectedColumns: ['buyers', 'repeat_buyers', 'repeat_rate'],
    reference: `WITH c AS (
  SELECT customer_id, COUNT(*) AS order_count
  FROM orders
  GROUP BY customer_id
)
SELECT COUNT(*) AS buyers,
       SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) AS repeat_buyers,
       ROUND(SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) * 100 / COUNT(*), 2) AS repeat_rate
FROM c`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '先数每人订单数，再统计比例',
        sql: `WITH c AS (SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id) SELECT COUNT(*) AS buyers, SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) AS repeat_buyers, ROUND(SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) * 100 / COUNT(*), 2) AS repeat_rate FROM c`,
        note: '两层结构：内层把 5 万订单压成"一人一行 + 订单数"，外层再按订单数分类统计。',
      },
      {
        label: '用布尔求和简写',
        sql: `WITH c AS (SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id) SELECT COUNT(*) AS buyers, SUM(order_count >= 2) AS repeat_buyers, ROUND(SUM(order_count >= 2) * 100 / COUNT(*), 2) AS repeat_rate FROM c`,
        note: 'MySQL 里比较运算返回 1/0，可以直接 SUM。更短，但 PostgreSQL 不支持这种写法，要写 CASE。',
      },
    ],
    followups: [
      '分母要不要包括"从没下过单的客户"？两种口径分别说明什么？',
      '复购率和留存率的区别是什么？',
      '如果按"90 天内是否再次下单"定义复购，SQL 要怎么改？',
    ],
  },

  {
    id: 'int-12',
    module: '经典面试题',
    difficulty: 2,
    title: '按订单数给客户分层',
    schema: 'shop',
    tags: ['分层', 'CASE', 'LEFT JOIN'],
    description:
      '把客户按"下过几单"分成 0 单、1 单、2-3 单、4 单及以上四层，看看每层有多少人。分层是用户运营的基础动作。',
    requirements: ['输出 2 列：band、customers', 'band 取值固定为：0单、1单、2-3单、4单及以上', '包含从没下单的客户', '按 0单、1单、2-3单、4单及以上 的顺序排列'],
    expectedColumns: ['band', 'customers'],
    reference: `SELECT band, COUNT(*) AS customers
FROM (
  SELECT c.id,
         CASE WHEN COUNT(o.id) = 0 THEN '0单'
              WHEN COUNT(o.id) = 1 THEN '1单'
              WHEN COUNT(o.id) <= 3 THEN '2-3单'
              ELSE '4单及以上' END AS band
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id
  GROUP BY c.id
) t
GROUP BY band
ORDER BY FIELD(band, '0单', '1单', '2-3单', '4单及以上')`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN 算订单数 + CASE 分档',
        sql: `SELECT band, COUNT(*) AS customers FROM (SELECT c.id, CASE WHEN COUNT(o.id) = 0 THEN '0单' WHEN COUNT(o.id) = 1 THEN '1单' WHEN COUNT(o.id) <= 3 THEN '2-3单' ELSE '4单及以上' END AS band FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id) t GROUP BY band ORDER BY FIELD(band, '0单', '1单', '2-3单', '4单及以上')`,
        note: '必须用 LEFT JOIN，否则"0 单"这一层永远为空。分档用 CASE，排序用 FIELD 指定业务顺序——直接按文字排序会得到奇怪的顺序。',
      },
      {
        label: '用 IF 嵌套',
        sql: `SELECT band, COUNT(*) AS customers FROM (SELECT c.id, IF(COUNT(o.id) = 0, '0单', IF(COUNT(o.id) = 1, '1单', IF(COUNT(o.id) <= 3, '2-3单', '4单及以上'))) AS band FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id) t GROUP BY band ORDER BY FIELD(band, '0单', '1单', '2-3单', '4单及以上')`,
        note: 'IF 嵌套能写，但三层以上可读性明显下降。分档超过两个就用 CASE。',
      },
    ],
    followups: [
      '为什么这里必须用 LEFT JOIN？换成 JOIN 会少掉哪一层？',
      'ORDER BY FIELD(...) 和直接 ORDER BY band 有什么区别？',
      '如果要按"消费金额"而不是"订单数"分层，SQL 改哪里？',
    ],
  },

  {
    id: 'int-13',
    module: '经典面试题',
    difficulty: 2,
    title: '每个客户的最新一单',
    schema: 'shop',
    tags: ['去重保留最新', 'ROW_NUMBER'],
    description:
      '"每个客户只留最新一条"是数据清洗和快照表的经典需求。用 ROW_NUMBER 按时间倒序编号，取 1 号即可。',
    requirements: ['输出 4 列：customer_id、order_id、order_date、total_amount', '每个客户一行，取其下单时间最晚的一单（同一时刻取 id 最大的）', '按 customer_id 升序，取前 30 行'],
    expectedColumns: ['customer_id', 'order_id', 'order_date', 'total_amount'],
    reference: `WITH t AS (
  SELECT customer_id, id AS order_id, order_date, total_amount,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn
  FROM orders
)
SELECT customer_id, order_id, order_date, total_amount
FROM t
WHERE rn = 1
ORDER BY customer_id
LIMIT 30`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'ROW_NUMBER 倒序取 1',
        sql: `WITH t AS (SELECT customer_id, id AS order_id, order_date, total_amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn FROM orders) SELECT customer_id, order_id, order_date, total_amount FROM t WHERE rn = 1 ORDER BY customer_id LIMIT 30`,
        note: '倒序编号后 1 号就是最新。注意 ORDER BY 里加了 id DESC 兜底，否则同一时刻的两单谁排前面是不确定的。',
      },
      {
        label: 'GROUP BY 取最大时间再回查',
        sql: `SELECT o.customer_id, o.id AS order_id, o.order_date, o.total_amount FROM orders o JOIN (SELECT customer_id, MAX(order_date) AS max_date FROM orders GROUP BY customer_id) m ON m.customer_id = o.customer_id AND m.max_date = o.order_date ORDER BY o.customer_id, o.id LIMIT 30`,
        note: '老办法。隐患是：如果同一客户在同一时刻有两单，两单都会被选出来，就不满足"每人一行"了。',
      },
    ],
    followups: [
      '上面第二种写法在什么情况下会返回多行？怎么修？',
      '真实业务里"删除重复只保留最新一条"怎么写？（提示：先选出要删的 id）',
      '如果要求"每个客户金额最大的一单"，SQL 改哪里？',
    ],
  },

  {
    id: 'int-14',
    module: '经典面试题',
    difficulty: 3,
    title: '每个类目最贵的商品及其占比',
    schema: 'shop',
    tags: ['分组取Top1', '占比', '窗口'],
    description: '每个类目挑出最贵的那个商品，同时算出它占本类目价格合计的百分比。一条 SQL 里同时用到"分组排名"和"分组求和"。',
    requirements: ['输出 4 列：category、name、price、pct', '每个类目一行，取价格最高的商品（并列取 id 小的）', 'pct 是该商品价格占本类目价格合计的百分比，保留 2 位小数', '按 category 升序'],
    expectedColumns: ['category', 'name', 'price', 'pct'],
    reference: `WITH t AS (
  SELECT p.id, p.category, p.name, p.price,
         SUM(p.price) OVER (PARTITION BY p.category) AS cat_total,
         ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY p.price DESC, p.id) AS rn
  FROM products p
)
SELECT category, name, price, ROUND(price * 100 / cat_total, 2) AS pct
FROM t
WHERE rn = 1
ORDER BY category`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '两个窗口同时用',
        sql: `WITH t AS (SELECT p.id, p.category, p.name, p.price, SUM(p.price) OVER (PARTITION BY p.category) AS cat_total, ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY p.price DESC, p.id) AS rn FROM products p) SELECT category, name, price, ROUND(price * 100 / cat_total, 2) AS pct FROM t WHERE rn = 1 ORDER BY category`,
        note: '两个窗口的分区相同、排序不同：SUM 不需要排序（算类目总额），ROW_NUMBER 需要（排名）。各写各的，互不影响。',
      },
      {
        label: '聚合 + 排名分两步',
        sql: `WITH tot AS (SELECT category, SUM(price) AS cat_total FROM products GROUP BY category), rk AS (SELECT p.id, p.category, p.name, p.price, ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY p.price DESC, p.id) AS rn FROM products p) SELECT r.category, r.name, r.price, ROUND(r.price * 100 / tot.cat_total, 2) AS pct FROM rk r JOIN tot ON tot.category = r.category WHERE r.rn = 1 ORDER BY r.category`,
        note: '把"类目总额"和"类目排名"拆成两个 CTE，逻辑更清楚，也方便单独调试某一步。',
      },
    ],
    followups: [
      '为什么 SUM(p.price) OVER (PARTITION BY category) 不需要 ORDER BY？',
      '如果类目下有并列最贵的商品，这个写法会返回几个？',
      '想改成"每个类目最贵的 3 个商品"，SQL 改哪里？',
    ],
  },

  {
    id: 'int-15',
    module: '经典面试题',
    difficulty: 4,
    title: '累计 80% 销售额需要多少个商品',
    schema: 'shop',
    tags: ['帕累托', '累计占比', '窗口'],
    description:
      '帕累托分析（二八定律）的经典问法：把商品按销售额从高到低排，一直累加，加到 80% 时用掉了多少个商品？这能回答"少数商品贡献大部分收入"到底有多集中。',
    requirements: ['输出 1 列：products_for_80pct', '把商品按销售额降序排列后逐行累加，统计累计占比仍小于 80% 的商品个数', '只返回 1 行'],
    expectedColumns: ['products_for_80pct'],
    reference: `WITH s AS (
  SELECT p.id, SUM(oi.qty * oi.unit_price) AS amt
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  GROUP BY p.id
), r AS (
  SELECT id, amt,
         SUM(amt) OVER (ORDER BY amt DESC, id) AS cum,
         SUM(amt) OVER () AS total
  FROM s
)
SELECT COUNT(*) AS products_for_80pct
FROM r
WHERE cum * 100 / total < 80`,
    ordered: false,
    roundTo: null,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '累计占比小于 80% 的个数',
        sql: `WITH s AS (SELECT p.id, SUM(oi.qty * oi.unit_price) AS amt FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.id), r AS (SELECT id, amt, SUM(amt) OVER (ORDER BY amt DESC, id) AS cum, SUM(amt) OVER () AS total FROM s) SELECT COUNT(*) AS products_for_80pct FROM r WHERE cum * 100 / total < 80`,
        note: '注意这里数的是"累计还没到 80% 的商品数"，所以真正跨过 80% 的那一个不算在内。业务上通常说"前 N 个商品贡献了 80%"，N 要比这个结果大 1。',
      },
      {
        label: '先算累计占比再数',
        sql: `WITH s AS (SELECT p.id, SUM(oi.qty * oi.unit_price) AS amt FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.id), r AS (SELECT id, ROUND(SUM(amt) OVER (ORDER BY amt DESC, id) * 100 / SUM(amt) OVER (), 2) AS cum_pct FROM s) SELECT COUNT(*) AS products_for_80pct FROM r WHERE cum_pct < 80`,
        note: '逻辑一样，只是先把百分比算出来再比较，可读性更好，也方便改成 90% 或 70%。',
      },
    ],
    followups: [
      '算出来的商品数占全部商品的比例是多少？这说明销售额集中度如何？',
      '为什么累计占比要用 ORDER BY 的 SUM，而不是普通 SUM？',
      '如果按客户而不是商品做同样的分析，能得出什么业务结论？',
    ],
  },

  {
    id: 'int-16',
    module: '经典面试题',
    difficulty: 3,
    title: '按注册月份看客户产出',
    schema: 'shop',
    tags: ['同期群', 'cohort', 'LEFT JOIN'],
    description:
      '把客户按注册月份分组（同期群），看每一批人一共下了多少单、人均几单。这是判断"渠道质量有没有变差"的标准方法。',
    requirements: ['输出 4 列：cohort、customers、orders、orders_per_customer', 'cohort 是注册年月（YYYY-MM）', 'customers 是该月注册人数，orders 是这些人累计下单数，orders_per_customer 保留 2 位小数', '按 cohort 升序'],
    expectedColumns: ['cohort', 'customers', 'orders', 'orders_per_customer'],
    reference: `SELECT DATE_FORMAT(c.signup_date, '%Y-%m') AS cohort,
       COUNT(DISTINCT c.id) AS customers,
       COUNT(o.id) AS orders,
       ROUND(COUNT(o.id) / COUNT(DISTINCT c.id), 2) AS orders_per_customer
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY cohort
ORDER BY cohort`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN 后按注册月聚合',
        sql: `SELECT DATE_FORMAT(c.signup_date, '%Y-%m') AS cohort, COUNT(DISTINCT c.id) AS customers, COUNT(o.id) AS orders, ROUND(COUNT(o.id) / COUNT(DISTINCT c.id), 2) AS orders_per_customer FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY cohort ORDER BY cohort`,
        note: '必须 COUNT(DISTINCT c.id)：一个客户有 6 单，连接后会出现 6 行，不去重人数就变成 6 了。而订单数用 COUNT(o.id)，左连接没单时是 0。',
      },
      {
        label: '两段聚合再关联',
        sql: `WITH cust AS (SELECT DATE_FORMAT(signup_date, '%Y-%m') AS cohort, COUNT(*) AS customers FROM customers GROUP BY cohort), ord AS (SELECT DATE_FORMAT(c.signup_date, '%Y-%m') AS cohort, COUNT(o.id) AS orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY cohort) SELECT cust.cohort, cust.customers, ord.orders, ROUND(ord.orders / cust.customers, 2) AS orders_per_customer FROM cust JOIN ord ON ord.cohort = cust.cohort ORDER BY cust.cohort`,
        note: '人数和订单数分别算，最后相除。不用 DISTINCT，逻辑更直白，也避免了"一对多放大"的心智负担。',
      },
    ],
    followups: [
      '为什么 customers 必须用 COUNT(DISTINCT)？不用会偏大多少？',
      '同期群分析和普通按月统计的区别是什么？',
      '如果某个 cohort 的客户最近才注册，它的 orders_per_customer 会比较低，这公平吗？怎么修正？',
    ],
  },

  {
    id: 'int-17',
    module: '经典面试题',
    difficulty: 3,
    title: '首单后 30 天内有没有复购',
    schema: 'shop',
    tags: ['复购', '首次行为', '时间窗口'],
    description:
      '只看"第一单之后的 30 天"这个窗口，算有多大比例的人又下了一单。这比笼统的复购率更能反映"新客激活"做得好不好。',
    requirements: ['输出 3 列：customers、repurchased、rate', 'customers 是有订单的客户数', 'repurchased 是首单后 30 天内（第 1–30 天）又下单的客户数', 'rate 保留 2 位小数', '只返回 1 行'],
    expectedColumns: ['customers', 'repurchased', 'rate'],
    reference: `WITH f AS (
  SELECT customer_id, MIN(order_date) AS d0
  FROM orders
  GROUP BY customer_id
), r AS (
  SELECT f.customer_id, f.d0,
         EXISTS (SELECT 1 FROM orders o
                 WHERE o.customer_id = f.customer_id
                   AND o.order_date > f.d0
                   AND o.order_date <= DATE_ADD(f.d0, INTERVAL 30 DAY)) AS repurchased
  FROM f
)
SELECT COUNT(*) AS customers,
       SUM(repurchased) AS repurchased,
       ROUND(SUM(repurchased) * 100 / COUNT(*), 2) AS rate
FROM r`,
    ordered: false,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '首单日期 + 窗口内 EXISTS',
        sql: `WITH f AS (SELECT customer_id, MIN(order_date) AS d0 FROM orders GROUP BY customer_id), r AS (SELECT f.customer_id, f.d0, EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = f.customer_id AND o.order_date > f.d0 AND o.order_date <= DATE_ADD(f.d0, INTERVAL 30 DAY)) AS repurchased FROM f) SELECT COUNT(*) AS customers, SUM(repurchased) AS repurchased, ROUND(SUM(repurchased) * 100 / COUNT(*), 2) AS rate FROM r`,
        note: '条件是 > d0 且 <= d0+30 天：既排除了首单本身，又把第 30 天当天算进来。这种"左开右闭"的写法在时间窗口里很常见。',
      },
      {
        label: 'LEFT JOIN 时间窗口',
        sql: `WITH f AS (SELECT customer_id, MIN(order_date) AS d0 FROM orders GROUP BY customer_id) SELECT COUNT(DISTINCT f.customer_id) AS customers, COUNT(DISTINCT l.customer_id) AS repurchased, ROUND(COUNT(DISTINCT l.customer_id) * 100 / COUNT(DISTINCT f.customer_id), 2) AS rate FROM f LEFT JOIN orders l ON l.customer_id = f.customer_id AND l.order_date > f.d0 AND l.order_date <= DATE_ADD(f.d0, INTERVAL 30 DAY)`,
        note: '把时间窗口写在 JOIN 条件里，连不上的就是没复购。因为一个客户在窗口内可能有多单，所以人数必须 COUNT(DISTINCT)。顺带提醒：换成 DATEDIFF 按日历天数算，和"精确 30×24 小时"会差一天。',
      },
    ],
    followups: [
      '为什么条件要写 > d0 而不是 >= d0？',
      '如果想看"首单后 30 天的复购率按注册月份分组"，怎么改？',
      'DATEDIFF 包在列上会影响索引使用吗？这种场景该怎么优化？',
    ],
  },

  {
    id: 'int-18',
    module: '经典面试题',
    difficulty: 3,
    title: '相邻两次登录平均隔几天',
    schema: 'shop',
    tags: ['LAG', 'DATEDIFF', 'HAVING'],
    description:
      '对每个用户，算出相邻两次登录之间的天数，再求平均。这个数越小说明使用频率越高，是判断"粘性"的指标。',
    requirements: ['输出 3 列：customer_id、gaps、avg_gap', 'gaps 是相邻间隔的个数，avg_gap 是平均间隔天数（保留 2 位小数）', '只保留 gaps >= 5 的用户', '按 avg_gap 降序、customer_id 升序', '取前 20 行'],
    expectedColumns: ['customer_id', 'gaps', 'avg_gap'],
    reference: `WITH t AS (
  SELECT customer_id, login_date,
         LAG(login_date) OVER (PARTITION BY customer_id ORDER BY login_date) AS prev_date
  FROM login_log
)
SELECT customer_id,
       COUNT(*) AS gaps,
       ROUND(AVG(DATEDIFF(login_date, prev_date)), 2) AS avg_gap
FROM t
WHERE prev_date IS NOT NULL
GROUP BY customer_id
HAVING COUNT(*) >= 5
ORDER BY avg_gap DESC, customer_id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: 'LAG 取上一次 + 分组求平均',
        sql: `WITH t AS (SELECT customer_id, login_date, LAG(login_date) OVER (PARTITION BY customer_id ORDER BY login_date) AS prev_date FROM login_log) SELECT customer_id, COUNT(*) AS gaps, ROUND(AVG(DATEDIFF(login_date, prev_date)), 2) AS avg_gap FROM t WHERE prev_date IS NOT NULL GROUP BY customer_id HAVING COUNT(*) >= 5 ORDER BY avg_gap DESC, customer_id LIMIT 20`,
        note: '每个人有 n 次登录就产生 n-1 个间隔，所以第一行（prev_date 为 NULL）必须过滤掉，否则 AVG 的分母会多算一个。',
      },
      {
        label: '自连接取上一次',
        sql: `SELECT a.customer_id, COUNT(*) AS gaps, ROUND(AVG(DATEDIFF(a.login_date, b.login_date)), 2) AS avg_gap FROM login_log a JOIN login_log b ON b.customer_id = a.customer_id AND b.login_date < a.login_date WHERE b.login_date = (SELECT MAX(c.login_date) FROM login_log c WHERE c.customer_id = a.customer_id AND c.login_date < a.login_date) GROUP BY a.customer_id HAVING COUNT(*) >= 5 ORDER BY avg_gap DESC, a.customer_id LIMIT 20`,
        note: '不用窗口函数就得靠相关子查询找"上一次"，每个用户每次登录都跑一遍，7 万行数据下会明显变慢。',
      },
    ],
    followups: [
      '为什么必须先过滤 prev_date IS NULL？不过滤会让 avg_gap 偏大还是偏小？',
      '平均间隔 3 天和平均间隔 30 天，分别对应什么类型的用户？',
      '想找出"间隔突然变长的用户"（可能流失），SQL 怎么写？',
    ],
  },

  {
    id: 'int-19',
    module: '经典面试题',
    difficulty: 3,
    title: '薪资占比高于平均水平的部门',
    schema: 'company',
    tags: ['占比', '窗口', '相对阈值'],
    description:
      '算每个部门薪资占全公司的比例，只留下"高于平均水平"的部门。这里不用固定阈值（比如 10%），而是用"100% ÷ 部门数"，这样换一套数据也成立。',
    requirements: ['输出 3 列：dept_name、total_salary、pct', 'total_salary 保留 2 位小数，pct 是占比（保留 2 位小数）', '只保留 pct 高于 100/部门数 的部门', '按 pct 降序、dept_name 升序'],
    expectedColumns: ['dept_name', 'total_salary', 'pct'],
    reference: `WITH d AS (
  SELECT d.id, d.name, SUM(e.salary) AS total
  FROM departments d
  JOIN employees e ON e.dept_id = d.id
  GROUP BY d.id, d.name
), r AS (
  SELECT name, total,
         ROUND(total * 100 / SUM(total) OVER (), 2) AS pct,
         COUNT(*) OVER () AS dept_cnt
  FROM d
)
SELECT name AS dept_name, ROUND(total, 2) AS total_salary, pct
FROM r
WHERE pct > 100 / dept_cnt
ORDER BY pct DESC, dept_name`,
    ordered: true,
    roundTo: 2,
    mustUse: ['window'],
    perf: null,
    solutions: [
      {
        label: '先算出 pct，再在外层过滤',
        sql: `WITH d AS (SELECT d.id, d.name, SUM(e.salary) AS total FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name), r AS (SELECT name, total, ROUND(total * 100 / SUM(total) OVER (), 2) AS pct, COUNT(*) OVER () AS dept_cnt FROM d) SELECT name AS dept_name, ROUND(total, 2) AS total_salary, pct FROM r WHERE pct > 100 / dept_cnt ORDER BY pct DESC, dept_name`,
        note: '为什么不能直接写 WHERE pct > 100/COUNT(*)？因为 WHERE 比窗口函数先执行，那时 pct 还不存在。必须套一层，在外层过滤。',
      },
      {
        label: '用平均占比做阈值',
        sql: `WITH d AS (SELECT d.id, d.name, SUM(e.salary) AS total FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id, d.name), r AS (SELECT name, total, ROUND(total * 100 / SUM(total) OVER (), 2) AS pct, ROUND(AVG(total) OVER (), 2) AS avg_total FROM d) SELECT name AS dept_name, ROUND(total, 2) AS total_salary, pct FROM r WHERE total > avg_total ORDER BY pct DESC, dept_name`,
        note: '换个等价条件：薪资总额高于"部门平均值"的部门，占比自然也高于平均占比。数学上等价，业务上更容易解释。',
      },
    ],
    followups: [
      '为什么 WHERE 里不能直接用窗口函数算出来的 pct？',
      '用固定阈值（比如 10%）和用相对阈值（100%/部门数）各有什么问题？',
      '如果部门数量会变，哪种写法更稳？',
    ],
  },

  {
    id: 'int-20',
    module: '经典面试题',
    difficulty: 3,
    title: '按最后登录时间给客户分层',
    schema: 'shop',
    tags: ['活跃分层', '流失', 'CASE'],
    description:
      '用"最后一次登录距今多久"把客户分成活跃、沉睡、流失三层。注意"距今"要有一个参照点，这里用全表最后一次登录的日期，避免依赖系统时间导致结果每天都变。',
    requirements: ['输出 2 列：seg、customers', 'seg 取值：30天内活跃、90天内活跃、流失', '距参照日 <= 30 天为活跃，<= 90 天为沉睡，其余流失', '按 30天内活跃、90天内活跃、流失 的顺序排列'],
    expectedColumns: ['seg', 'customers'],
    reference: `WITH last AS (
  SELECT customer_id, MAX(login_date) AS last_login
  FROM login_log
  GROUP BY customer_id
), ref AS (
  SELECT MAX(login_date) AS d FROM login_log
)
SELECT CASE WHEN DATEDIFF(ref.d, last.last_login) <= 30 THEN '30天内活跃'
            WHEN DATEDIFF(ref.d, last.last_login) <= 90 THEN '90天内活跃'
            ELSE '流失' END AS seg,
       COUNT(*) AS customers
FROM last CROSS JOIN ref
GROUP BY seg
ORDER BY FIELD(seg, '30天内活跃', '90天内活跃', '流失')`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'CROSS JOIN 一个参照日期',
        sql: `WITH last AS (SELECT customer_id, MAX(login_date) AS last_login FROM login_log GROUP BY customer_id), ref AS (SELECT MAX(login_date) AS d FROM login_log) SELECT CASE WHEN DATEDIFF(ref.d, last.last_login) <= 30 THEN '30天内活跃' WHEN DATEDIFF(ref.d, last.last_login) <= 90 THEN '90天内活跃' ELSE '流失' END AS seg, COUNT(*) AS customers FROM last CROSS JOIN ref GROUP BY seg ORDER BY FIELD(seg, '30天内活跃', '90天内活跃', '流失')`,
        note: 'CROSS JOIN 只有一行，作用是把这个"参照日期"塞进每一行，让 DATEDIFF 有得算。用 CURDATE() 也行，但结果会随运行日期变化，没法判题。',
      },
      {
        label: '用标量子查询取参照日',
        sql: `WITH last AS (SELECT customer_id, MAX(login_date) AS last_login FROM login_log GROUP BY customer_id) SELECT CASE WHEN DATEDIFF((SELECT MAX(login_date) FROM login_log), last_login) <= 30 THEN '30天内活跃' WHEN DATEDIFF((SELECT MAX(login_date) FROM login_log), last_login) <= 90 THEN '90天内活跃' ELSE '流失' END AS seg, COUNT(*) AS customers FROM last GROUP BY seg ORDER BY FIELD(seg, '30天内活跃', '90天内活跃', '流失')`,
        note: '把参照日写成标量子查询，省掉 CROSS JOIN。子查询只返回一个值，MySQL 会缓存结果，性能没差别。',
      },
    ],
    followups: [
      '为什么不用 CURDATE() 作为参照日？',
      '如果要按"注册月份 × 活跃状态"做交叉分析，SQL 怎么改？',
      '"流失"的定义为什么和业务强相关？电商和社交产品的标准一样吗？',
    ],
  },
];
