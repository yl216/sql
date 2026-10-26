// 模块 7：数据修改（DML）
// 这一章的题判的不是结果集，而是"执行完之后数据库变成了什么样"。
// 每题带一条 verify 查询，用来把最终状态取出来做比对；reference 里写标准做法。
export const DML = [
  {
    id: 'dml-01',
    module: '数据修改（DML）',
    difficulty: 1,
    title: '新增一个部门',
    schema: 'sandbox',
    dml: true,
    tags: ['INSERT', '列清单'],
    description:
      '往部门表里插入一个新部门：编号 9、名称「运营部」、预算 320000。这是最基础的写入操作，重点是搞清楚"列和值必须一一对应"。',
    requirements: ['往 dept 表插入一行：id=9、name=运营部、budget=320000', '只插入这一行，不要动其它数据'],
    expectedColumns: ['id', 'name', 'budget'],
    reference: `INSERT INTO dept (id, name, budget) VALUES (9, '运营部', 320000)`,
    verify: `SELECT id, name, budget FROM dept ORDER BY id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '写明列名（推荐）',
        sql: `INSERT INTO dept (id, name, budget) VALUES (9, '运营部', 320000)`,
        note: '列名写全，值按同样的顺序给。以后表加了一列，这条语句也不会崩。',
      },
      {
        label: '省略列名',
        sql: `INSERT INTO dept VALUES (9, '运营部', 320000)`,
        note: '值的顺序必须和表结构完全一致。表结构一改（比如中间插了一列），这条就会报错或者把数据插到错误的列里。生产代码不要这么写。',
      },
    ],
    followups: [
      'INSERT 不写列名有什么风险？',
      '如果 id 是自增主键，插入时应该怎么写？',
      'INSERT 的返回值里 affectedRows 是几？',
    ],
  },

  {
    id: 'dml-02',
    module: '数据修改（DML）',
    difficulty: 1,
    title: '一次插入三个员工',
    schema: 'sandbox',
    dml: true,
    tags: ['INSERT', '多行插入'],
    description:
      '往员工表里一次插入三个新员工。逐条 INSERT 也能做对，但批量插入只走一次网络、一次解析，效率差好几倍。',
    requirements: [
      '插入三行：',
      'id=41, name=新员工A, dept_id=1, salary=12000, hired=2025-03-01',
      'id=42, name=新员工B, dept_id=2, salary=9500, hired=2025-03-15',
      'id=43, name=新员工C, dept_id=3, salary=15000, hired=2025-04-01',
    ],
    expectedColumns: ['id', 'name', 'dept_id', 'salary', 'hired'],
    reference: `INSERT INTO emp (id, name, dept_id, salary, hired) VALUES
  (41, '新员工A', 1, 12000, '2025-03-01'),
  (42, '新员工B', 2, 9500,  '2025-03-15'),
  (43, '新员工C', 3, 15000, '2025-04-01')`,
    verify: `SELECT id, name, dept_id, salary, hired FROM emp ORDER BY id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '一条语句多个 VALUES',
        sql: `INSERT INTO emp (id, name, dept_id, salary, hired) VALUES (41, '新员工A', 1, 12000, '2025-03-01'), (42, '新员工B', 2, 9500, '2025-03-15'), (43, '新员工C', 3, 15000, '2025-04-01')`,
        note: '批量插入只解析一次、走一次网络。插 1000 行时，这个差别是几十毫秒 vs 好几秒。',
      },
      {
        label: '三条独立 INSERT',
        sql: `INSERT INTO emp (id, name, dept_id, salary, hired) VALUES (41, '新员工A', 1, 12000, '2025-03-01');
INSERT INTO emp (id, name, dept_id, salary, hired) VALUES (42, '新员工B', 2, 9500, '2025-03-15');
INSERT INTO emp (id, name, dept_id, salary, hired) VALUES (43, '新员工C', 3, 15000, '2025-04-01')`,
        note: '结果一样，但三条语句要三次往返。注意：如果没有包在事务里，中途失败会留下"插了一半"的脏数据。',
      },
    ],
    followups: [
      '批量插入和逐条插入差在哪？数据量大了差多少？',
      '一次插太多会不会有问题？受什么参数限制？',
      '如果第二条因为主键冲突失败了，第一条还会留着吗？',
    ],
  },

  {
    id: 'dml-03',
    module: '数据修改（DML）',
    difficulty: 2,
    title: '全员涨薪 10%',
    schema: 'sandbox',
    dml: true,
    tags: ['UPDATE', '计算列'],
    description:
      '给所有员工的月薪涨 10%。写的时候要小心：UPDATE 一旦漏了 WHERE，就是全表改——这既是功能，也是事故。',
    requirements: ['把 emp 表所有员工的 salary 上调 10%', '金额保留 2 位小数（按四舍五入）'],
    expectedColumns: ['id', 'salary'],
    reference: `UPDATE emp SET salary = ROUND(salary * 1.1, 2)`,
    verify: `SELECT id, salary FROM emp ORDER BY id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'SET 里直接算',
        sql: `UPDATE emp SET salary = ROUND(salary * 1.1, 2)`,
        note: 'UPDATE 的 SET 可以引用本行的旧值，数据库会基于修改前的值算新值。所有行用同一个公式，不需要循环。',
      },
      {
        label: '不写 ROUND',
        sql: `UPDATE emp SET salary = salary * 1.1`,
        note: '结果一样。salary 是 DECIMAL(10,2)，存进去时会自动四舍五入到 2 位。写 ROUND 只是让意图更明确。',
      },
    ],
    followups: [
      'UPDATE 语句漏写 WHERE 会发生什么？怎么防止？',
      'SET salary = salary * 1.1 里的 salary 是修改前的值还是修改后的？',
      '只想给「研发部」涨薪，SQL 怎么写？',
    ],
  },

  {
    id: 'dml-04',
    module: '数据修改（DML）',
    difficulty: 3,
    title: '按员工薪资重算部门预算',
    schema: 'sandbox',
    dml: true,
    tags: ['UPDATE', '子查询', 'LEFT JOIN'],
    description:
      '把每个部门的预算改成"该部门所有员工薪资之和"。注意有些部门一个员工都没有，它们的预算应该变成 0，而不是保持不变。',
    requirements: ['把 dept 表每一行的 budget 改成该部门员工的 salary 之和', '没有员工的部门，budget 记为 0'],
    expectedColumns: ['id', 'budget'],
    reference: `UPDATE dept d
SET budget = COALESCE((SELECT SUM(e.salary) FROM emp e WHERE e.dept_id = d.id), 0)`,
    verify: `SELECT id, budget FROM dept ORDER BY id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '相关子查询 + COALESCE',
        sql: `UPDATE dept d SET budget = COALESCE((SELECT SUM(e.salary) FROM emp e WHERE e.dept_id = d.id), 0)`,
        note: '子查询按部门算总和，空部门的 SUM 返回 NULL，用 COALESCE 兜成 0。8 个部门就跑 8 次子查询，代价可以接受。',
      },
      {
        label: 'LEFT JOIN 派生表',
        sql: `UPDATE dept d
LEFT JOIN (SELECT dept_id, SUM(salary) AS total FROM emp GROUP BY dept_id) t
  ON t.dept_id = d.id
SET d.budget = COALESCE(t.total, 0)`,
        note: '先把 40 行员工压成"每部门一个总数"，再关联回去。必须用 LEFT JOIN：用 INNER JOIN 的话，没有员工的部门匹配不上，预算就不会被改成 0。',
      },
    ],
    followups: [
      '为什么这里必须用 LEFT JOIN 而不是 INNER JOIN？',
      '如果写成 UPDATE dept SET budget = (SELECT SUM(salary) FROM dept ...)，会报什么错？',
      '部门有几百个、员工有几十万时，哪种写法更快？',
    ],
  },

  {
    id: 'dml-05',
    module: '数据修改（DML）',
    difficulty: 1,
    title: '删掉 2020 年前入职的员工',
    schema: 'sandbox',
    dml: true,
    tags: ['DELETE', '日期比较'],
    description:
      '删除所有在 2020 年 1 月 1 日之前入职的员工。删除是不可逆的，所以"先 SELECT 确认再 DELETE"是必须养成的习惯。',
    requirements: ['删除 emp 表里 hired 早于 2020-01-01 的所有行', '2020-01-01 当天入职的保留'],
    expectedColumns: ['id'],
    reference: `DELETE FROM emp WHERE hired < '2020-01-01'`,
    verify: `SELECT id FROM emp ORDER BY id`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '直接比较日期',
        sql: `DELETE FROM emp WHERE hired < '2020-01-01'`,
        note: 'hired 是 DATE 类型，和字符串 \'2020-01-01\' 比较时会自动转换，边界是"小于"，所以 1 月 1 日当天入职的人会保留。',
      },
      {
        label: '用 YEAR 函数',
        sql: `DELETE FROM emp WHERE YEAR(hired) < 2020`,
        note: '结果一样，但列被函数包住，索引失效。40 行的表无所谓，40 万行就是灾难——这是删除操作里最容易忽略的性能问题。',
      },
    ],
    followups: [
      'DELETE 之前应该先做什么来确认影响范围？',
      'DELETE、TRUNCATE、DROP 三者有什么区别？',
      '误删了数据怎么恢复？',
    ],
  },

  {
    id: 'dml-06',
    module: '数据修改（DML）',
    difficulty: 3,
    title: '清理没有员工的空部门',
    schema: 'sandbox',
    dml: true,
    tags: ['DELETE', '反连接', 'NULL 陷阱', '外键'],
    description:
      '把没有任何员工的部门删掉。这题有两个坑：一是员工表里有人的 dept_id 是 NULL，用 NOT IN 会踩到 NULL 陷阱；二是外键约束会挡住"删还有人的部门"。',
    requirements: ['删除 dept 表里没有任何员工指向的部门', '有员工的部门必须保留'],
    expectedColumns: ['id', 'name'],
    reference: `DELETE d FROM dept d
LEFT JOIN emp e ON e.dept_id = d.id
WHERE e.id IS NULL`,
    verify: `SELECT id, name FROM dept ORDER BY id`,
    ordered: true,
    roundTo: null,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'LEFT JOIN 反连接',
        sql: `DELETE d FROM dept d LEFT JOIN emp e ON e.dept_id = d.id WHERE e.id IS NULL`,
        note: '注意 DELETE 后面要写别名 d，表示"删 dept 这边的行"。漏了别名就变成删两张表的行，会报错或者误删。',
      },
      {
        label: 'NOT EXISTS',
        sql: `DELETE FROM dept WHERE NOT EXISTS (SELECT 1 FROM emp e WHERE e.dept_id = dept.id)`,
        note: '语义最清楚，也不受 NULL 影响。员工表的 dept_id 是 NULL 的行不会匹配任何部门，符合预期。',
      },
      {
        label: '错误示范：NOT IN',
        sql: `DELETE FROM dept WHERE id NOT IN (SELECT dept_id FROM emp)`,
        note: '子查询结果里有 NULL（40 号员工没有部门），NOT IN 会把整个条件变成"不知道"，结果一行都删不掉。这是 NOT IN 最经典的坑。',
        wrong: true,
      },
    ],
    followups: [
      '为什么 NOT IN 的版本删不掉任何东西？',
      '如果直接删一个有员工的部门，会报什么错？怎么才能删？',
      '外键的 ON DELETE CASCADE 是什么含义？什么时候该用？',
    ],
  },

  {
    id: 'dml-07',
    module: '数据修改（DML）',
    difficulty: 3,
    title: '有就加钱、没有就开户',
    schema: 'sandbox',
    dml: true,
    tags: ['UPSERT', 'ON DUPLICATE KEY'],
    description:
      '给编号 7 的账户加 50 元：如果这个账户还不存在，就新建一个（户名「新用户」、余额 50）；如果已经存在，就只把余额加 50，户名不动。一条语句搞定。',
    requirements: ['id=7 的账户不存在时：插入 (7, 新用户, 50)', 'id=7 已存在时：余额 +50，户名保持不变'],
    expectedColumns: ['id', 'owner', 'balance'],
    reference: `INSERT INTO account (id, owner, balance) VALUES (7, '新用户', 50)
ON DUPLICATE KEY UPDATE balance = balance + 50`,
    verify: `SELECT id, owner, balance FROM account ORDER BY id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: 'INSERT ... ON DUPLICATE KEY UPDATE',
        sql: `INSERT INTO account (id, owner, balance) VALUES (7, '新用户', 50) ON DUPLICATE KEY UPDATE balance = balance + 50`,
        note: 'MySQL 的 UPSERT 写法。命中主键或唯一键冲突时，执行后面的 UPDATE 分支而不是报错。返回的影响行数：插入是 1，更新是 2，值没变化是 0。',
      },
      {
        label: '用行别名引用新值',
        sql: `INSERT INTO account (id, owner, balance) VALUES (7, '新用户', 50) AS new ON DUPLICATE KEY UPDATE balance = account.balance + new.balance`,
        note: 'MySQL 8.0.19 起支持给 VALUES 起别名，比老的 VALUES(balance) 写法更清晰，也避免列名歧义。',
      },
      {
        label: '错误示范：REPLACE INTO',
        sql: `REPLACE INTO account (id, owner, balance) VALUES (7, '新用户', 50)`,
        note: '看起来也能跑，但 REPLACE 的语义是"先删掉旧行再插新行"。如果账户已存在，原来的户名会被覆盖成「新用户」，余额也变成 50 而不是加 50。它还会连带触发级联删除，非常危险。',
        wrong: true,
      },
    ],
    followups: [
      'ON DUPLICATE KEY UPDATE 返回的影响行数 1、2、0 分别代表什么？',
      'REPLACE INTO 和 UPSERT 的本质区别是什么？为什么说它危险？',
      '没有唯一键的话，ON DUPLICATE KEY UPDATE 还会生效吗？',
    ],
  },

  {
    id: 'dml-08',
    module: '数据修改（DML）',
    difficulty: 3,
    title: '用事务完成一笔转账',
    schema: 'sandbox',
    dml: true,
    tags: ['事务', 'COMMIT', '原子性'],
    description:
      '从 1 号账户转 100 元到 2 号账户。两个 UPDATE 必须"要么都成功、要么都不发生"——如果只扣了钱没加上，账就丢了。这是事务存在的最直接理由。',
    requirements: ['1 号账户余额减 100，2 号账户余额加 100', '两个操作必须在同一个事务里，最后提交'],
    expectedColumns: ['id', 'balance'],
    reference: `START TRANSACTION;
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;
COMMIT;`,
    verify: `SELECT id, balance FROM account WHERE id IN (1, 2) ORDER BY id`,
    ordered: true,
    roundTo: 2,
    mustUse: null,
    perf: null,
    solutions: [
      {
        label: '显式事务（标准做法）',
        sql: `START TRANSACTION;
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;
COMMIT;`,
        note: 'START TRANSACTION 之后的所有修改都在同一个事务里，COMMIT 才真正落盘。中间任何一步失败，ROLLBACK 就能全部撤销。',
      },
      {
        label: '一条 UPDATE 用 CASE',
        sql: `UPDATE account SET balance = CASE id WHEN 1 THEN balance - 100 WHEN 2 THEN balance + 100 END WHERE id IN (1, 2)`,
        note: '单条语句本身就是原子的，不需要显式事务。适合这种"固定几个账户"的场景，但账户多了就不实用。',
      },
    ],
    followups: [
      '如果不写 COMMIT 会发生什么？',
      'START TRANSACTION 和 BEGIN 有什么区别？',
      '转账时怎么防止"两个并发事务同时扣同一笔钱"？',
      '事务的 ACID 分别指什么？',
    ],
  },
];
