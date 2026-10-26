// 模块 1：基础查询与 NULL
export const BASIC = [
  {
    id: 'basic-01',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '取出员工列表的前 20 条',
    schema: 'company',
    tags: ['SELECT', 'ORDER BY', 'LIMIT'],
    description: '从员工表里取出 id 最小的 20 位员工，只需要编号、姓名、职级三列。这是所有查询的地基：先想清楚要哪几列、按什么顺序、取多少行。',
    requirements: ['输出 3 列：id、name、title', '按 id 升序', '只取前 20 行'],
    expectedColumns: ['id', 'name', 'title'],
    reference: `SELECT id, name, title
FROM employees
ORDER BY id
LIMIT 20`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'ORDER BY + LIMIT',
        sql: `SELECT id, name, title FROM employees ORDER BY id LIMIT 20`,
        note: '标准写法。LIMIT 是在排序之后才截断的，所以顺序是可靠的。',
      },
      {
        label: 'LIMIT offset, count 写法',
        sql: `SELECT id, name, title FROM employees ORDER BY id LIMIT 0, 20`,
        note: 'LIMIT 0, 20 等价于 LIMIT 20 OFFSET 0。offset 在前、条数在后，这个顺序很多人会记反。',
      },
    ],
    followups: [
      '去掉 ORDER BY 只写 LIMIT 20，结果顺序可靠吗？为什么？',
      'LIMIT 是在 WHERE、GROUP BY、ORDER BY 之前还是之后执行的？',
      'id 从 1 连续到 5000，如果换成 WHERE id <= 20，结果和这题一样吗？为什么不能依赖这个巧合？',
    ],
  },

  {
    id: 'basic-02',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '薪资高于 20000 的员工',
    schema: 'company',
    tags: ['WHERE', 'ORDER BY', 'LIMIT'],
    description: '找出月薪高于 20000 的员工，薪资高的排前面，薪资相同时按 id 升序。注意这里刻意要求了并列时的次序，否则每次运行结果可能不一样。',
    requirements: ['输出 3 列：id、name、salary', '只保留 salary > 20000 的员工', '按 salary 降序，salary 相同时按 id 升序', '取前 50 行'],
    expectedColumns: ['id', 'name', 'salary'],
    reference: `SELECT id, name, salary
FROM employees
WHERE salary > 20000
ORDER BY salary DESC, id
LIMIT 50`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'WHERE + 双字段排序',
        sql: `SELECT id, name, salary FROM employees WHERE salary > 20000 ORDER BY salary DESC, id LIMIT 50`,
        note: 'ORDER BY 后面加 id 是为了让并列薪资有确定的先后。少了它，LIMIT 截断的位置就是随机的。',
      },
      {
        label: 'NOT 反向写法',
        sql: `SELECT id, name, salary FROM employees WHERE NOT (salary <= 20000) ORDER BY salary DESC, id LIMIT 50`,
        note: '和 salary > 20000 等价。但要注意：如果 salary 允许 NULL，NOT (salary <= 20000) 对 NULL 行返回 UNKNOWN，这些行会被漏掉。',
      },
    ],
    followups: [
      '如果 salary 列允许 NULL，上面两种写法的结果还一样吗？',
      'ORDER BY salary DESC 之后为什么还要加 id？不加会有什么风险？',
      'salary 是 DECIMAL(10,2)，和浮点数比较有什么需要注意的？',
    ],
  },

  {
    id: 'basic-03',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '还没分配部门的员工',
    schema: 'company',
    tags: ['IS NULL', '三值逻辑'],
    description: '公司里有 119 位员工暂时没有归属部门，他们的 dept_id 是 NULL。把这批人找出来。这题的重点不是写对，而是想清楚为什么 = NULL 查不到东西。',
    requirements: ['输出 2 列：id、name', '只保留 dept_id 为 NULL 的员工', '按 id 升序'],
    expectedColumns: ['id', 'name'],
    reference: `SELECT id, name
FROM employees
WHERE dept_id IS NULL
ORDER BY id`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'IS NULL（唯一正确写法）',
        sql: `SELECT id, name FROM employees WHERE dept_id IS NULL ORDER BY id`,
        note: 'NULL 表示"未知"，任何和 NULL 的比较结果都是 UNKNOWN，不是 TRUE，所以 WHERE 不会选中它。只能用 IS NULL 判断。',
      },
      {
        label: 'NOT (IS NOT NULL)',
        sql: `SELECT id, name FROM employees WHERE NOT (dept_id IS NOT NULL) ORDER BY id`,
        note: '逻辑上等价。IS NOT NULL 返回的是明确的 TRUE/FALSE，所以 NOT 取反是安全的——这一点和 NOT (dept_id = 5) 完全不同。',
      },
      {
        label: '错误示范：= NULL',
        sql: `SELECT id, name FROM employees WHERE dept_id = NULL ORDER BY id`,
        note: '永远返回 0 行。因为 dept_id = NULL 的结果是 UNKNOWN，WHERE 只放行 TRUE。这是 SQL 新手最常踩的坑。',
        wrong: true,
      },
    ],
    followups: [
      '为什么 WHERE dept_id = NULL 一行都查不到？',
      'COUNT(*) 和 COUNT(dept_id) 在这张表上差多少？差的那部分是谁？',
      '如果要把 dept_id 为 NULL 的人归到"未分配"部门一起统计，SQL 怎么写？',
    ],
  },

  {
    id: 'basic-04',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '有直属上级的员工（前 10 位）',
    schema: 'company',
    tags: ['IS NOT NULL', 'LIMIT'],
    description: 'manager_id 记录直属上级的员工编号，为空表示这位员工没有上级（比如总监）。取出有上级的员工中 id 最小的 10 位。',
    requirements: ['输出 3 列：id、name、manager_id', '只保留 manager_id 不为 NULL 的员工', '按 id 升序，取前 10 行'],
    expectedColumns: ['id', 'name', 'manager_id'],
    reference: `SELECT id, name, manager_id
FROM employees
WHERE manager_id IS NOT NULL
ORDER BY id
LIMIT 10`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'IS NOT NULL',
        sql: `SELECT id, name, manager_id FROM employees WHERE manager_id IS NOT NULL ORDER BY id LIMIT 10`,
        note: '标准写法，语义最清楚。',
      },
      {
        label: '用数值比较代替',
        sql: `SELECT id, name, manager_id FROM employees WHERE manager_id > 0 ORDER BY id LIMIT 10`,
        note: '因为 id 都是正整数，manager_id > 0 恰好排除了 NULL（NULL 参与比较得到 UNKNOWN）。能跑对，但语义不直观，换一张表就可能失效。',
      },
    ],
    followups: [
      'IS NOT NULL 能用到 manager_id 上的索引吗？IS NULL 呢？',
      'COUNT(manager_id) 和 COUNT(*) 的差值说明什么？',
      '怎么一次性算出"有上级"和"没上级"各多少人？',
    ],
  },

  {
    id: 'basic-05',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '总部在成都的部门',
    schema: 'company',
    tags: ['WHERE', '字符串比较'],
    description: '按城市筛选部门。字符串比较看起来简单，但涉及排序规则（collation）和索引使用，面试里经常顺着这个点往下问。',
    requirements: ['输出 3 列：id、name、city', '只保留 city 等于「成都」的部门', '按 id 升序'],
    expectedColumns: ['id', 'name', 'city'],
    reference: `SELECT id, name, city
FROM departments
WHERE city = '成都'
ORDER BY id`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '等值比较',
        sql: `SELECT id, name, city FROM departments WHERE city = '成都' ORDER BY id`,
        note: '最直接的写法，能走 city 上的索引（如果建了的话）。',
      },
      {
        label: 'LIKE 无通配符',
        sql: `SELECT id, name, city FROM departments WHERE city LIKE '成都' ORDER BY id`,
        note: '没有 % 和 _ 时，LIKE 等价于等值比较，优化器也会当作等值处理。但只要有前导 %，索引立刻失效。',
      },
    ],
    followups: [
      '这张表的 collation 是 utf8mb4_0900_ai_ci，ci 意味着什么？\'ABC\' 和 \'abc\' 会相等吗？',
      '如果改成 LIKE \'%都%\'，还能用索引吗？为什么？',
      'city 列上没建索引，现在只有 12 行所以无所谓。如果是一千万行呢？',
    ],
  },

  {
    id: 'basic-06',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '姓名里带「华」字的员工',
    schema: 'company',
    tags: ['LIKE', '模糊匹配'],
    description: '模糊匹配是日常查询里用得最多、也最容易写出慢查询的地方。这里先练写法，性能问题留到追问里。',
    requirements: ['输出 2 列：id、name', '只保留 name 中包含「华」字的员工', '按 id 升序，取前 30 行'],
    expectedColumns: ['id', 'name'],
    reference: `SELECT id, name
FROM employees
WHERE name LIKE '%华%'
ORDER BY id
LIMIT 30`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LIKE 包含匹配',
        sql: `SELECT id, name FROM employees WHERE name LIKE '%华%' ORDER BY id LIMIT 30`,
        note: '百分号 % 匹配任意长度字符，前后都加就是"包含"。前导 % 会让 B+ 树索引失效，只能全表扫。',
      },
      {
        label: 'LOCATE 函数',
        sql: `SELECT id, name FROM employees WHERE LOCATE('华', name) > 0 ORDER BY id LIMIT 30`,
        note: '返回子串位置，找不到返回 0。结果一样，但列被函数包住，同样用不上索引。',
      },
    ],
    followups: [
      'LIKE \'华%\'（只有后置通配符）能走索引吗？为什么？',
      '如果一定要支持"包含"搜索且数据量大，有哪些方案？（倒排索引 / 全文索引 / 搜索引擎）',
      'LIKE 里的 _ 和 % 分别匹配什么？要匹配字面上的 % 怎么写？',
    ],
  },

  {
    id: 'basic-07',
    module: '基础查询与 NULL',
    difficulty: 2,
    title: '2024 年入职的员工',
    schema: 'company',
    tags: ['日期区间', 'sargable'],
    description: 'hire_date 是 DATE 类型。要筛出 2024 全年入职的人，写法有很多种，但只有一部分能用上索引。',
    requirements: ['输出 3 列：id、name、hire_date', '只保留 2024-01-01 到 2024-12-31 入职的员工', '按 hire_date 升序，同一天入职按 id 升序', '取前 30 行'],
    expectedColumns: ['id', 'name', 'hire_date'],
    reference: `SELECT id, name, hire_date
FROM employees
WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01'
ORDER BY hire_date, id
LIMIT 30`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '左闭右开区间（推荐）',
        sql: `SELECT id, name, hire_date FROM employees WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01' ORDER BY hire_date, id LIMIT 30`,
        note: '列上不做运算，能走索引做范围扫描。用 < 下一年 1 月 1 日 而不是 <= 2024-12-31，是为了避免漏掉当天带时分秒的数据。',
      },
      {
        label: 'YEAR() 函数（能跑但慢）',
        sql: `SELECT id, name, hire_date FROM employees WHERE YEAR(hire_date) = 2024 ORDER BY hire_date, id LIMIT 30`,
        note: '结果正确，但 hire_date 被函数包住，索引失效，5 千行要全表扫。这类写法叫不 sargable，是线上慢查询的头号成因。',
      },
      {
        label: 'BETWEEN',
        sql: `SELECT id, name, hire_date FROM employees WHERE hire_date BETWEEN '2024-01-01' AND '2024-12-31' ORDER BY hire_date, id LIMIT 30`,
        note: '这里是 DATE 类型所以安全。如果字段是 DATETIME，BETWEEN ... \'2024-12-31\' 会漏掉当天 00:00:00 之后的记录——这就是为什么更推荐左闭右开。',
      },
    ],
    followups: [
      'hire_date 是 DATE，如果是 DATETIME，BETWEEN \'2024-01-01\' AND \'2024-12-31\' 会漏掉哪些数据？',
      'YEAR(hire_date) = 2024 为什么用不上索引？改成 hire_date >= ... 为什么就能用？',
      '如果业务上按"财年"统计（4 月开始），SQL 该怎么写？',
    ],
  },

  {
    id: 'basic-08',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '公司一共有几种职级',
    schema: 'company',
    tags: ['DISTINCT'],
    description: '职级列里大量重复，只想知道有哪几种。这题很短，但 DISTINCT 的语义和多列场景经常被问。',
    requirements: ['输出 1 列：title', '去掉重复值', '按 title 升序'],
    expectedColumns: ['title'],
    reference: `SELECT DISTINCT title
FROM employees
ORDER BY title`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'DISTINCT',
        sql: `SELECT DISTINCT title FROM employees ORDER BY title`,
        note: 'DISTINCT 作用于整行，不是单列。多列时是"组合去重"。',
      },
      {
        label: 'GROUP BY',
        sql: `SELECT title FROM employees GROUP BY title ORDER BY title`,
        note: '在这个场景下和 DISTINCT 等价，执行计划通常也一样（都会用临时表或索引去重）。需要额外聚合时就顺手用 GROUP BY。',
      },
    ],
    followups: [
      'SELECT DISTINCT title, salary 是"职级去重"还是"职级+薪资组合去重"？',
      'DISTINCT 和 ORDER BY 一起用时，ORDER BY 的列必须出现在 SELECT 里吗？',
      'DISTINCT 和 GROUP BY 在性能上有区别吗？',
    ],
  },

  {
    id: 'basic-09',
    module: '基础查询与 NULL',
    difficulty: 2,
    title: '技术专家或总监里的低薪者',
    schema: 'company',
    tags: ['AND', 'OR', 'IN', '优先级'],
    description: '找出「职级是技术专家或总监」并且「月薪低于 30000」的员工。题面简单，但 AND 和 OR 的优先级是经典陷阱。',
    requirements: ['输出 4 列：id、name、title、salary', '职级是「技术专家」或「总监」，并且薪资 < 30000', '按 id 升序，取前 40 行'],
    expectedColumns: ['id', 'name', 'title', 'salary'],
    reference: `SELECT id, name, title, salary
FROM employees
WHERE title IN ('技术专家', '总监')
  AND salary < 30000
ORDER BY id
LIMIT 40`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'IN + AND（推荐）',
        sql: `SELECT id, name, title, salary FROM employees WHERE title IN ('技术专家', '总监') AND salary < 30000 ORDER BY id LIMIT 40`,
        note: 'IN 本质是多个等值条件的 OR，用括号包成整体后再和 AND 组合，不会有优先级问题。',
      },
      {
        label: 'OR + 显式括号',
        sql: `SELECT id, name, title, salary FROM employees WHERE (title = '技术专家' OR title = '总监') AND salary < 30000 ORDER BY id LIMIT 40`,
        note: '括号必须加。AND 的优先级高于 OR，不加括号就变成"技术专家"或"总监且薪资<30000"，结果完全不同。',
      },
      {
        label: '错误示范：漏掉括号',
        sql: `SELECT id, name, title, salary FROM employees WHERE title = '技术专家' OR title = '总监' AND salary < 30000 ORDER BY id LIMIT 40`,
        note: '实际执行的是 title = \'技术专家\' OR (title = \'总监\' AND salary < 30000)。所有技术专家都会被选进来，不管薪资多少。',
        wrong: true,
      },
    ],
    followups: [
      '不加括号时，上面那条 SQL 实际按什么顺序结合？结果多了哪部分人？',
      'IN 和 OR 在性能上有区别吗？列表很长时呢？',
      'NOT IN 遇到子查询里有 NULL 会发生什么？',
    ],
  },

  {
    id: 'basic-10',
    module: '基础查询与 NULL',
    difficulty: 1,
    title: '算出年薪并排名',
    schema: 'company',
    tags: ['计算列', '别名', 'ORDER BY'],
    description: 'salary 是月薪，按 12 个月算年薪，输出年薪并取出最高的 10 位。这题考的是：别名在哪个子句里能用、在哪个子句里不能用。',
    requirements: ['输出 4 列：id、name、salary、annual_salary', 'annual_salary = salary * 12，保留 2 位小数', '按 annual_salary 降序，相同则按 id 升序', '取前 10 行'],
    expectedColumns: ['id', 'name', 'salary', 'annual_salary'],
    reference: `SELECT id, name, salary, ROUND(salary * 12, 2) AS annual_salary
FROM employees
ORDER BY annual_salary DESC, id
LIMIT 10`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '计算列 + 别名排序',
        sql: `SELECT id, name, salary, ROUND(salary * 12, 2) AS annual_salary FROM employees ORDER BY annual_salary DESC, id LIMIT 10`,
        note: 'ORDER BY 可以用 SELECT 里定义的别名，因为排序发生在投影之后。',
      },
      {
        label: 'ORDER BY 里重复表达式',
        sql: `SELECT id, name, salary, ROUND(salary * 12, 2) AS annual_salary FROM employees ORDER BY salary * 12 DESC, id LIMIT 10`,
        note: '不依赖别名，可移植性更好（有些数据库不允许 ORDER BY 用别名）。因为乘 12 是单调变换，按 salary 排序结果也一样。',
      },
    ],
    followups: [
      '为什么 WHERE 里不能用 annual_salary 这个别名，ORDER BY 里却可以？',
      '如果别名是关键字（比如 AS order），会发生什么？',
      'ROUND 和 TRUNCATE 在金额场景下有什么区别？',
    ],
  },

  {
    id: 'basic-11',
    module: '基础查询与 NULL',
    difficulty: 2,
    title: '给薪资分档',
    schema: 'company',
    tags: ['CASE WHEN', '派生列'],
    description: '按薪资把员工分成四档：低于 1 万为「低」、1 万到 2.5 万为「中」、2.5 万到 4.5 万为「高」、其余为「极高」。输出前 20 位员工及其档位。',
    requirements: ['输出 4 列：id、name、salary、band', 'band 取值只能是「低」「中」「高」「极高」', '分界点：<10000 低，<25000 中，<45000 高，其余极高', '按 id 升序，取前 20 行'],
    expectedColumns: ['id', 'name', 'salary', 'band'],
    reference: `SELECT id, name, salary,
       CASE WHEN salary < 10000 THEN '低'
            WHEN salary < 25000 THEN '中'
            WHEN salary < 45000 THEN '高'
            ELSE '极高' END AS band
FROM employees
ORDER BY id
LIMIT 20`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'CASE WHEN 顺序判断',
        sql: `SELECT id, name, salary, CASE WHEN salary < 10000 THEN '低' WHEN salary < 25000 THEN '中' WHEN salary < 45000 THEN '高' ELSE '极高' END AS band FROM employees ORDER BY id LIMIT 20`,
        note: 'CASE 是顺序匹配，命中第一个为真的分支就停。所以分支顺序必须从窄到宽，写反了后面永远不生效。',
      },
      {
        label: '嵌套 IF',
        sql: `SELECT id, name, salary, IF(salary < 10000, '低', IF(salary < 25000, '中', IF(salary < 45000, '高', '极高'))) AS band FROM employees ORDER BY id LIMIT 20`,
        note: '能跑，但嵌套三层以后可读性明显变差。分支超过两个就建议用 CASE。',
      },
    ],
    followups: [
      '如果把 WHEN salary < 45000 放到第一个分支，结果会变成什么？',
      'CASE 和 COALESCE / IFNULL 解决的是同一类问题吗？',
      '如果要按档位分组统计人数，怎么在这个基础上继续写？',
    ],
  },

  {
    id: 'basic-12',
    module: '基础查询与 NULL',
    difficulty: 2,
    title: '薪资榜第 21 到 30 名',
    schema: 'company',
    tags: ['LIMIT', 'OFFSET', '分页'],
    description: '取薪资排名第 21 到第 30 的员工（每页 10 条的第 3 页）。分页写法是面试必问，深分页的性能问题更是高频。',
    requirements: ['输出 3 列：id、name、salary', '按 salary 降序、id 升序排列后，跳过前 20 行，取接下来 10 行'],
    expectedColumns: ['id', 'name', 'salary'],
    reference: `SELECT id, name, salary
FROM employees
ORDER BY salary DESC, id
LIMIT 10 OFFSET 20`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LIMIT n OFFSET m（推荐）',
        sql: `SELECT id, name, salary FROM employees ORDER BY salary DESC, id LIMIT 10 OFFSET 20`,
        note: '语义清楚：跳过 20 行，取 10 行。ORDER BY 必须稳定，否则翻页会出现重复或遗漏。',
      },
      {
        label: 'LIMIT m, n',
        sql: `SELECT id, name, salary FROM employees ORDER BY salary DESC, id LIMIT 20, 10`,
        note: 'MySQL 特有的简写，第一个数字是偏移量、第二个是条数。和上面的写法完全等价，但容易和 LIMIT 10, 20 搞混。',
      },
    ],
    followups: [
      'LIMIT 100000, 20 为什么会变慢？慢在哪一步？',
      '有哪几种优化深分页的办法？（延迟关联 / 游标分页 / 记录上次的最大 id）',
      '如果排序字段有大量重复值，翻页会出现重复数据吗？怎么避免？',
    ],
  },
];
