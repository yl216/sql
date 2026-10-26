# SQL 练习台

个人自用的 MySQL 练习网站。题目走「求职面试」路线，判题分五个挡位。

**106 道题**（SELECT 98 + 增删改 8），五挡判题、大白话讲解、面试模拟、成绩曲线。

## 环境要求

- Node.js 20+（开发用的是 22）
- MySQL 8.0（本机 3306 端口），需要 `CREATE DATABASE` / `CREATE USER` 权限
- 数据库账号密码写在 `server/.env`（从模板复制，模板里是本地默认值）

## 首次运行

```bash
# 1. 装依赖（前后端各一份）
npm install
npm --prefix web install

# 2. 配置数据库连接
cp server/.env.example server/.env   # 然后按本机情况改 DB_USER / DB_PASSWORD

# 3. 建库、灌数据、创建只读和沙盒账号
npm run seed      # 会 DROP 掉所有 sqlprac_* 库，可重复执行

# 4. 构建前端
npm run build:web

# 5. 起服务（同时提供页面和判题接口）
npm start
```

打开 http://127.0.0.1:3001

> `npm run seed` 建 8 个库、约 20 万行数据，第一次跑大概 1–2 分钟。它同时会创建两个受限账号：`sqlprac_ro`（只读，跑用户 SQL）和 `sqlprac_rw`（只能改 DML 沙盒）。

## 启动

```bash
# 起服务（会同时提供前端页面和判题接口）
npm start
# 或者 node server/src/index.mjs
```

打开 http://127.0.0.1:3001

改前端时用 Vite 热更新（页面在 5173，接口代理到 3001）：

```bash
npm --prefix web run dev
```

改完前端要重新构建，`node server/src/index.mjs` 才会用新版本：

```bash
npm --prefix web run build
```

## 面试模拟

顶栏「面试模拟」按钮进入。可选出题范围、题量（1/3/5）、每题时长（8/12/20 分钟），随机抽题。

进入后：

- 左边栏换成题号列表，看不到题库，也不能翻参考答案
- 顶部有倒计时条，最后 1 分钟变红闪烁，时间到自动交卷
- 「运行」「执行计划」按钮消失，`Ctrl+Enter` 失效，自动补全关闭 —— 手写 SQL，写完才能看结果
- 交卷后编辑器锁定，按钮变成「下一题」
- 全部做完进入本场结果页：得分、每题用时，点任意一行可以回到那道题看解析

会话存在 localStorage，**刷新不会丢**（倒计时按绝对截止时间算，关掉页面再回来接着走）。

## 面试记录

每场结束自动入库，顶栏「面试记录」查看。存的是轻量记录（时间、范围、得分、每题通过情况、用时），不存 SQL 原文，最多保留 50 场。

页面上有三样东西：

- **概览**：总场次、累计题数、平均通过率、历史最好
- **趋势柱**：最近 12 场，柱高 = 通过率，全对绿色、全错红色
- **明细**：每场一行，圆点表示每题结果（绿=通过、红=未过、橙=超时）

数据存在 `localStorage` 的 `sqlprac:interview-history`，可以「清空记录」重置。

## 做题记录存在哪

记录**不在浏览器里，在服务端**：`server/.data/profile.json`。

存的内容：已通过的题、每题草稿、上次打开的题、侧栏折叠状态、面试成绩历史。

为什么要这样：`localStorage` 是按「协议 + 域名 + 端口」隔离的，`127.0.0.1:3001`、`localhost:3001`、`5173` 开发端口各自一份。以前只存浏览器，换个地址打开就像"记录丢了"——数据其实还在，只是看不见。现在服务端存一份，浏览器只当缓存，换地址、换浏览器、清缓存都能找回来。

- 启动时合并「本地缓存 + 服务端记录」，并把合并结果写回两边
- 改动 400ms 内合并成一次请求；关页面前用 `sendBeacon` 兜底
- 删除这个文件就等于清空所有记录（服务会重新建一份空的）

## 其他命令

| 命令 | 作用 |
|---|---|
| `npm run seed` | 重建所有练习库并灌数据（会 DROP 掉 `sqlprac_*`） |
| `npm test` | 判题引擎自测，10 条用例覆盖五个挡位 |
| `npm run verify` | 题库自检，49 道题全部校验一遍 |

`verify` 会逐题检查：标准答案能不能跑、列数对不对、结果是否为空、连跑两次结果是否一致（排序不唯一会被抓出来）、隐藏数据集上能不能跑，以及**每种备选解法的结果是否与标准答案一致**。加完题一定要跑一次。

## 五个挡位

| 挡位 | 判什么 | 失败时的提示 |
|---|---|---|
| 跑通 | 无语法/运行时错误 | MySQL 错误码翻译成中文（1055/1140/1242/1064 等） |
| 正确 | 结果集与标准答案一致 | 多了/少了哪几行，逐行列出 |
| 稳健 | 隐藏数据集复跑仍一致 | 换一套边界数据就不成立 |
| 高效 | 执行计划扫描行数达标 | 扫描行数、是否全表扫、是否 filesort |
| 优雅 | 满足题目指定的写法（如必须用窗口函数） | 缺哪个语法点 |

只有全部挡位通过才算过。性能挡位只在题目声明 `perf` 时才判，不是每题都判——基础题判性能只会制造噪音。

## 目录

```
server/src/
  seed.mjs        建库、灌数据、建只读账号
  questions.mjs   SCHEMAS 表结构元数据 + 汇总各模块题库
  questions/
    basic.mjs     基础查询与 NULL（12 题）
    aggregate.mjs 聚合与分组（16 题）
    join.mjs      JOIN 与反连接（19 题）
    window.mjs    窗口函数（20 题）
    interview.mjs 经典面试题（20 题）
    indexes.mjs   索引与执行计划（11 题）
    dml.mjs       数据修改（8 题）
    explain.mjs   讲解层：每题一段大白话 + 用到的术语
    glossary.mjs  术语表：全站共用的 65 个概念解释
  judge.mjs       执行、结果集比对、EXPLAIN 解析、语法检查
  errors.mjs      MySQL 错误码翻译 + SQL 安全护栏
  store.mjs       做题记录持久化（JSON 文件）
  index.mjs       Fastify 路由
  selftest.mjs    判题引擎自测
  verify.mjs      题库自检
web/src/
  App.tsx         三栏布局、练习/面试两种模式的状态机
  components/     题库侧栏、题目面板、编辑器、结果面板、面试设置/侧栏/结果页
```

## 题库现状

共 106 道，全部通过 `npm run verify`：

| 模块 | 题量 | 覆盖点 |
|---|---|---|
| 基础查询与 NULL | 12 | WHERE / ORDER BY / LIMIT / LIKE / DISTINCT / CASE / 三值逻辑 |
| 聚合与分组 | 16 | GROUP BY / HAVING / 条件聚合 / 占比 / 时间分组 / NULL 聚合 |
| JOIN 与反连接 | 19 | INNER / LEFT / 自连接 / 反连接 / 非等值 / CROSS JOIN / 派生表 |
| 窗口函数 | 20 | ROW_NUMBER / RANK / DENSE_RANK / NTILE / LAG / LEAD / 累计 / 移动平均 / 中位数 |
| 经典面试题 | 20 | 连续登录 / 留存率 / 同比环比 / 行转列 / 帕累托 / 同期群 / 复购 / 分层 |
| 索引与执行计划 | 11 | 等值 / 范围 / 复合索引 / 索引选择 / sargable / 全表扫描 |
| 数据修改（DML） | 8 | INSERT / UPDATE / DELETE / 反连接 / UPSERT / 事务 |

每题带 2–3 种解法（含错误示范）+ 2–4 个面试追问。

### 索引模块的特殊之处

这一章的题**光结果对不够**，还要看执行计划。每题都配了一个"结果完全正确但很慢"的写法，标 `slow: true`。

性能挡位有三个判据，按题组合使用：

| 字段 | 判什么 |
|---|---|
| `maxRowsExamined` | 估算扫描行数上限 |
| `forbidFilesort` | 不允许产生 filesort（排序没走索引） |
| `forbidAccessType` | 不允许出现 ALL（全表扫）或 index（全索引扫） |

`verify` 会做两件事：断言**标准答案自己先通过**这套阈值；断言**每个 `slow: true` 的写法确实被判为低效**。这样阈值就不会形同虚设。

## 讲解层

参考答案面板分三层，都是给"看不懂"准备的：

1. **这道题在干什么** —— 一段不带术语的大白话，说明题目在解决什么问题。
2. **每种解法 + 说明** —— SQL 本身，以及"为什么这么写、什么时候用"的注解；故意写错的示范会标红。
3. **术语解释** —— 这道题涉及的生词做成可展开卡片，每个都给出「大白话解释」和「什么时候用」。

内容放在两个文件里，和题目结构分离：

- `questions/glossary.mjs`：全站术语表（45 个概念）。同一个词在所有题目下共用一份解释，避免说法不一致。
- `questions/explain.mjs`：按题目 id 给出 `plain`（大白话）和 `terms`（引用术语表的 key）。

`npm run verify` 会检查每道题都有 `plain`、`terms` 里的 key 都存在，并提示没被任何题目引用的术语。

## DML 沙盒

增删改的题不能直接跑在练习库上，所以单独有一个 `sqlprac_sandbox`：

- 每次提交前从模板库（`sqlprac_sandbox_tpl`）**整表重建**，起点永远一致
- 写操作走独立账号 `sqlprac_rw`，它只有沙盒的权限，碰不到其它库
- 判题方式是"比对最终数据"：先跑标准答案取期望状态，重置，再跑你的 SQL，比对
- **执行和校验用两个连接**，所以忘写 `COMMIT` 的事务读不到，会被正确判失败
- 隐藏模板 `sqlprac_sandbox_tpl_hid` 数据不同：比如 id=7 的账户在隐藏集里已经存在，裸 `INSERT` 会在稳健挡位挂掉

题库里还留了一个 `NOT IN` 的 NULL 陷阱：`emp` 表里有员工的 `dept_id` 是 NULL，用 `NOT IN` 删空部门会一行都删不掉。

## 数据

| 库 | 内容 | 规模 |
|---|---|---|
| `sqlprac_company` | 部门/员工/项目/参与关系 | 员工 5,000（119 人无部门） |
| `sqlprac_shop` | 客户/商品/订单/明细/登录日志 | 订单 50,000，明细 10 万，登录 7 万 |
| `sqlprac_school` | 学生/课程/成绩 | 成绩 20,000（391 条缺考） |
| `sqlprac_sandbox` | DML 练习用的部门/员工/账户 | 8 / 40 / 6 行，每次判题前重置 |

`login_log` 是按"会话"生成的：每人有若干段连续登录，段与段之间隔几天。这样"连续登录 N 天""次日留存"才有真实数据可练，最长连续段 19 天。

每个库都有一份 `_hid` 隐藏数据集（数据不同、含边界值），用来验证答案不是靠猜或硬编码。
判题连接用只读账号 `sqlprac_ro`，SQL 里出现增删改会被直接拒绝。

## 加一道题

在 `server/src/questions.mjs` 的 `QUESTIONS` 里追加一项：

```js
{
  id: 'shop-agg-01',
  module: '聚合与分组',
  difficulty: 2,
  title: '每个城市的订单总额',
  schema: 'shop',                       // 绑定哪个库
  tags: ['GROUP BY'],
  description: '……',
  requirements: ['输出 2 列：city、total', '按 total 降序'],
  expectedColumns: ['city', 'total'],
  reference: `SELECT city, SUM(total_amount) AS total ...`,  // 标准答案
  ordered: true,          // 是否要求行顺序
  roundTo: 2,             // 数值按几位小数比较，null 表示精确比较
  mustUse: null,          // ['window'] / ['cte'] / ['join'] / ['exists']
  perf: null,             // { maxRowsExamined: 3000 } 才启用高效挡位
  solutions: [            // 至少两种解法 + 说明
    { label: '...', sql: '...', note: '...' },
  ],
  followups: ['面试官可能追问的问题'],
}
```

加完重启服务，跑一次 `npm test` 确认没把判题改坏。

然后在 `questions/explain.mjs` 里补一条讲解（**必填**，`npm run verify` 会检查）：

```js
'shop-agg-01': {
  plain: '按城市把订单金额加起来……',   // 大白话，别用术语
  terms: ['group-by', 'aggregate'],     // key 必须存在于 glossary.mjs
},
```

遇到术语表里没有的词，先在 `glossary.mjs` 加一条（name / en / plain / usage），再在题目里引用。

## 下一步

- 索引模块补"深分页"和"覆盖索引"（EXPLAIN 对 LIMIT 的估算不准，需要换 `EXPLAIN ANALYZE` 拿实际行数）
- DML 扩到 15 题：加 CREATE/ALTER 建表、索引维护、批量更新分批、乐观锁
