// 讲解层：每道题一段"这道题在干什么"的大白话，以及这道题会用到的术语。
// terms 里的 key 必须存在于 glossary.mjs，verify.mjs 会检查。
export const EXPLAIN = {
  'basic-01': {
    plain:
      '就是把员工表里 id 最小的 20 个人挑出来看看。没什么技巧，重点是养成习惯：先想清楚要哪几列，再想清楚按什么顺序排、取多少行。',
    terms: ['select', 'order-by', 'limit'],
  },
  'basic-02': {
    plain:
      '按"月薪"这一栏筛人，只留下工资够高的，再从高到低排队。题目特意要求"薪资相同时按 id 排"，这是为了让顺序固定下来——不然每次跑出来的先后可能都不一样。',
    terms: ['where', 'order-by', 'limit', 'null'],
  },
  'basic-03': {
    plain:
      '找出 dept_id 这一格是空的员工。看起来像"等于空"，但 SQL 里偏偏不能用等号去和空比，得换一种专门的判断方式。',
    terms: ['null', 'three-valued-logic', 'is-null', 'count-star'],
  },
  'basic-04': {
    plain:
      'manager_id 记的是"我的上级是谁"。这一格有值就说明有上级，没值就说明已经到顶了（比如总监）。',
    terms: ['is-null', 'null', 'count-star'],
  },
  'basic-05': {
    plain:
      '按城市这一列做精确匹配，只留下成都的部门。字符串比较的坑不在写法，而在两件事：怎么算"相等"、能不能用上索引。',
    terms: ['where', 'collation', 'like', 'sargable'],
  },
  'basic-06': {
    plain:
      '在名字里做"包含"搜索，跟 Excel 筛选里的"包含"是一个意思。写法不难，难点是这种写法通常用不上索引。',
    terms: ['like', 'sargable', 'where'],
  },
  'basic-07': {
    plain:
      '按入职日期卡一个时间范围。这题的重点不在结果，而在写法：好几种写法都能算对，但只有一部分能用上索引。',
    terms: ['where', 'between', 'sargable', 'explain'],
  },
  'basic-08': {
    plain:
      '职级这一列有几千行、大量重复，但我们只想知道"有哪几种"。相当于把这一列的值去重后列出来。',
    terms: ['distinct', 'group-by', 'aggregate'],
  },
  'basic-09': {
    plain:
      '两个条件得同时满足：职级是那两种之一，并且薪资要低。这种"或者"和"并且"混在一起的时候，括号写不写会得出完全不同的结果。',
    terms: ['where', 'execution-order'],
  },
  'basic-10': {
    plain:
      '月薪乘 12 得到年薪，把它当成一个新列显示出来，再按这个新列排名。顺带看清一个细节：给列起的名字，在哪几个地方能用、哪几个地方不能用。',
    terms: ['alias', 'order-by', 'where'],
  },
  'basic-11': {
    plain:
      '按工资高低贴标签：低、中、高、极高。本质就是用 SQL 写一串 if-else，从窄的条件开始判断。',
    terms: ['case-when', 'alias', 'conditional-aggregation'],
  },
  'basic-12': {
    plain:
      '翻页：跳过前 20 个人，取接下来的 10 个。这是所有列表页的基础，也是"越翻越慢"这个经典问题的源头。',
    terms: ['limit', 'offset', 'deep-pagination', 'order-by'],
  },

  'agg-01': {
    plain:
      '两个最基础的统计：一共几行、这一列的平均数。看着简单，但"数行数"和"数某一列有值的个数"其实是两回事。',
    terms: ['aggregate', 'count-star', 'null'],
  },
  'agg-02': {
    plain:
      '"每个部门多少人"——先把人按部门分成一堆一堆，再数每堆有多少。两个坑：没部门的人不算进来；没人的部门要显示 0，不能消失。',
    terms: ['group-by', 'left-join', 'count-star', 'aggregate'],
  },
  'agg-03': {
    plain: '还是先按部门分堆，然后每一堆各取最大值和最小值，看看部门内部的薪资差距。',
    terms: ['group-by', 'aggregate', 'having'],
  },
  'agg-04': {
    plain:
      '先数出每个部门多少人，再把"人数不够"的部门整组扔掉。注意"扔掉一组"和"扔掉一行"用的是两个不同的关键字，搞混就会报错。',
    terms: ['having', 'group-by', 'execution-order', 'aggregate'],
  },
  'agg-05': {
    plain: '把客户按城市分堆，数每堆几个人。最标准的分组统计形态。',
    terms: ['group-by', 'aggregate', 'null'],
  },
  'agg-06': {
    plain: '按商品类目分堆，每一堆同时算三个数：几个商品、平均多少钱、最贵多少钱。',
    terms: ['group-by', 'aggregate', 'having'],
  },
  'agg-07': {
    plain:
      '一个部门同时要两个数：总人数、以及其中经理有几个。难点是"经理"只是部门里的一部分人，不能靠筛行解决，得在计算过程里做判断。',
    terms: ['conditional-aggregation', 'case-when', 'group-by', 'aggregate'],
  },
  'agg-08': {
    plain:
      '先数每种状态多少单，再算它占全部的百分之几。难点在"占比"：分母是整张表的总数，而分子是分组之后的结果，两个数不在同一个层级。',
    terms: ['group-by', 'scalar-subquery', 'window-function', 'aggregate'],
  },
  'agg-09': {
    plain:
      '把下单时间"砍"成"年-月"这个粒度，再按月统计单量和金额。相当于把每天的数据汇总成一张月度报表。',
    terms: ['date-format', 'group-by', 'sargable', 'window-function'],
  },
  'agg-10': {
    plain:
      '数每个客户下了几单，从多到少排队取前 20。注意"一单没下的客户"也该算 0 单，不能因为没数据就直接消失。',
    terms: ['group-by', 'left-join', 'count-star', 'limit'],
  },
  'agg-11': {
    plain:
      '部门表里有城市，员工表里有薪资，先把两张表拼起来，再按城市汇总。顺带一个经典陷阱：把几个平均数再平均一次，不等于真正的平均。',
    terms: ['group-by', 'inner-join', 'weighted-average', 'aggregate'],
  },
  'agg-12': {
    plain:
      '每门课都有一批人选了，其中一部分人缺考。题目要你区分"选课人数"和"实际有人数"，再算平均分——而平均分只算有成绩的那些人。',
    terms: ['aggregate', 'count-star', 'null', 'group-by'],
  },
  'agg-13': {
    plain: '数每门课有几个人没来考试，只保留确实有人缺考的课程。',
    terms: ['conditional-aggregation', 'null', 'having', 'count-star'],
  },
  'agg-14': {
    plain: '把每个部门的工资加起来，取总额最高的 5 个。分组、求和、排序、截断，四步连着走。',
    terms: ['group-by', 'aggregate', 'limit', 'order-by'],
  },
  'agg-15': {
    plain:
      '一个订单可能买好几件同类商品，明细表里就是好几行。所以"有多少订单买过这类商品"必须对订单去重，直接数行会把订单数算多。',
    terms: ['group-by', 'distinct', 'aggregate', 'inner-join'],
  },
  'cmp-agg-01': {
    plain:
      '先算出每个部门的平均工资，再拿它和"全公司的平均工资"比，比它高的部门留下。难点是后半句：全公司平均值只有一个数，得单独查出来当"尺子"用。',
    terms: ['group-by', 'having', 'scalar-subquery', 'window-function'],
  },

  'join-01': {
    plain:
      '员工表里只存了"部门编号"，看不出部门叫什么。要把两张表按编号对上，把部门名"贴"到每个人旁边。',
    terms: ['inner-join', 'alias', 'execution-order', 'cartesian-product'],
  },
  'join-02': {
    plain:
      '上级本身也是员工，也在这张表里。所以要拿这张表和自己配对：一份当"员工"看，一份当"上级"看。',
    terms: ['self-join', 'alias', 'inner-join', 'correlated-subquery'],
  },
  'join-03': {
    plain:
      '找出"客户表里有、订单表里找不到"的人。SQL 没有现成的"没有"这个语法，得绕个弯表达出来。',
    terms: ['anti-join', 'left-join', 'not-exists', 'not-in'],
  },
  'join-04': {
    plain:
      '数每个人参与了几个项目，没参与的要显示 0。听着简单，但计数方式用错，就会把"没参与"算成"参与了 1 个"。',
    terms: ['left-join', 'count-star', 'group-by', 'derived-table'],
  },
  'join-05': {
    plain: '明细表只记了商品编号，要看到商品名和类目，得把商品表接上。',
    terms: ['inner-join', 'where', 'order-by'],
  },
  'join-06': {
    plain: '一张订单下面挂着好几行明细，要把这些明细"卷起来"算：几行、几件、一共多少钱。',
    terms: ['group-by', 'aggregate', 'inner-join', 'derived-table'],
  },
  'join-07': {
    plain:
      '把学生和成绩接起来，算每个人的平均分，再排名取前 20。缺考的成绩是空的，不参与平均分的计算。',
    terms: ['inner-join', 'aggregate', 'null', 'limit'],
  },
  'join-08': {
    plain: '和"员工与上级"那道题正好相反：这次要找的是"找不到上级"的人。',
    terms: ['anti-join', 'left-join', 'self-join', 'is-null'],
  },
  'join-09': {
    plain:
      '先算出每个部门的平均工资，再逐个人比对"我的工资有没有超过我部门的平均"。难点在于尺子是"每个部门一把"，不能用全公司的一个数去比。',
    terms: ['subquery', 'derived-table', 'correlated-subquery', 'inner-join', 'having'],
  },
  'join-10': {
    plain: '把员工和上级配对之后，做一次减法：上级的工资减去自己的。只留下上级确实更高的那些。',
    terms: ['self-join', 'alias', 'where'],
  },
  'join-11': {
    plain:
      '找重名的人。但要求更细：两个人同名，而且不在同一个部门。还得保证同一对组合只出现一次——不能既出现 (1,2) 又出现 (2,1)。',
    terms: ['self-join', 'alias', 'inner-join', 'group-by'],
  },
  'join-12': {
    plain:
      '做一张交叉表：12 个部门 × 7 个职级，每个格子填人数。难点是"某个部门恰好没有某个职级"时，那一格不能凭空消失，得老老实实显示 0。',
    terms: ['cross-join', 'left-join', 'count-star', 'conditional-aggregation'],
  },
  'join-13': {
    plain:
      '用一张"区间表"给工资贴标签。和普通连接的区别在于：连接条件不是"相等"，而是"落在哪个区间里"。',
    terms: ['non-equi-join', 'union-all', 'derived-table', 'case-when'],
  },
  'join-14': {
    plain: '把每个人所有科目的分数加起来排名。缺考的科目是空的，加总时会自动跳过，不会拉低总分。',
    terms: ['inner-join', 'aggregate', 'null', 'limit'],
  },
  'join-15': {
    plain: '数每个项目有多少人参与，取人数最多的 10 个。',
    terms: ['inner-join', 'aggregate', 'group-by', 'limit'],
  },
  'join-16': {
    plain: '把每个部门名下项目的预算加起来。没有项目的部门要显示 0，而不是留一个空。',
    terms: ['left-join', 'aggregate', 'coalesce', 'null'],
  },
  'join-17': {
    plain:
      '算一个"人均"指标：部门产生的参与记录总数 ÷ 部门人数。坑在于一次连接会把员工行"放大"，所以数人数时必须去重。',
    terms: ['inner-join', 'left-join', 'count-star', 'distinct', 'weighted-average'],
  },
  'join-18': {
    plain: '三张表串起来，筛出参与项目数 ≥ 3 的人，再按总工时排序取前 20。',
    terms: ['inner-join', 'having', 'group-by', 'derived-table'],
  },
  'cmp-join-01': {
    plain: '和"没有订单的客户"是同一个套路：找出员工表里有、但参与关系表里找不到对应记录的人。',
    terms: ['anti-join', 'left-join', 'not-exists', 'not-in'],
  },

  'cmp-win-01': {
    plain:
      '在每个部门内部排个名次，只留下前 2 名。特别之处是"并列"：同样工资的人共享同一个名次，而且并列的人都要保留，所以一个部门可能返回超过 2 个人。',
    terms: ['window-function', 'partition-by', 'dense-rank', 'execution-order'],
  },
  'shop-perf-01': {
    plain:
      '筛出某个月已完成的订单，按金额取前 20。结果很容易写对，但这题还看"查询够不够快"：条件写法不对，5 万行就得一行行扫过去。',
    terms: ['sargable', 'composite-index', 'explain', 'filesort', 'between'],
  },

  'win-01': {
    plain:
      '在每个部门内部，按工资从高到低给人编上 1、2、3……的号，然后只留前 5 号。窗口函数最基础的用法——它只往每行旁边加一个序号，不会像分组那样把明细行合并掉。',
    terms: ['window-function', 'partition-by', 'top-n'],
  },
  'win-02': {
    plain:
      '同一份数据，用三种排名函数各排一遍，放在一起看差别。有并列的时候，三种函数给出的名次完全不同，这是面试里最爱追问的点。',
    terms: ['dense-rank', 'window-function', 'execution-order'],
  },
  'win-03': {
    plain:
      '把全公司的人按工资从低到高排好队，平均切成 4 摞，看每摞的工资区间。做用户分层、成绩分档都是这个动作。',
    terms: ['ntile', 'window-function', 'group-by'],
  },
  'win-04': {
    plain:
      '"每个部门第三高是多少"——先排好名次，再挑第 3 名。关键是"并列怎么算"：如果前两名有 5 个人并列，用错函数就再也找不到第 3 高了。',
    terms: ['dense-rank', 'window-function', 'top-n'],
  },
  'win-05': {
    plain:
      '把研发部的人按工资从高到低排好，逐行往上加：第 1 行是自己，第 2 行是前两人之和……这样就能看出"加到第几个人时，累计金额过半"。',
    terms: ['window-function', 'moving-average', 'execution-order'],
  },
  'win-06': {
    plain:
      '从工资最高的那个人开始往下数，一边数一边累加，看前 20 个人一共拿走了全公司多少比例的工资。这就是二八分析：少数人占了多少资源。',
    terms: ['pareto', 'window-function', 'top-n'],
  },
  'win-07': {
    plain:
      '把全公司按工资排成一条队，每个人同时看两边的邻居：比前一名少多少、比后一名多多少。LAG 看前一行，LEAD 看后一行。',
    terms: ['lag-lead', 'window-function'],
  },
  'win-08': {
    plain:
      '每个部门都有个"天花板"（工资最高的那个人），现在要算出部门里每个人离天花板还差多少。难点是天花板要"每部门各算各的"。',
    terms: ['first-value', 'partition-by', 'window-function'],
  },
  'win-09': {
    plain:
      '把 2024 年每月的订单数排成一列，看每个月比上个月多了还是少了。环比就是"这个月和上个月比"。',
    terms: ['lag-lead', 'yoy-mom', 'cte'],
  },
  'win-10': {
    plain:
      '同比是"今年这个月和去年这个月比"。数据有三年，把每个月和它 12 个月前的同一个月对上，算增长率。',
    terms: ['lag-lead', 'yoy-mom', 'cte'],
  },
  'win-11': {
    plain:
      '每天的成交额忽高忽低，看不出趋势。把当天和前面 6 天加起来求平均，得到 7 日移动平均，曲线就平滑了。',
    terms: ['moving-average', 'window-function'],
  },
  'win-12': {
    plain:
      '先按部门算出工资总额，再看每个部门占全公司的百分之几。难点是"已经分组了，还要看见全局总数"。',
    terms: ['window-function', 'group-by', 'derived-table'],
  },
  'win-13': {
    plain:
      '同样是算占比，但这次分母是"本类目"而不是"全部商品"。PARTITION BY 就是把计算范围切到每个类目内部。',
    terms: ['partition-by', 'window-function', 'group-by'],
  },
  'win-14': {
    plain:
      '一个客户可能下过很多单，现在要压缩成一人一行：第一次下单是什么时候、最近一次是什么时候。',
    terms: ['first-value', 'distinct', 'window-function'],
  },
  'win-15': {
    plain:
      '中位数是"排序后正中间那个数"，MySQL 没有现成函数，得自己排好序、编号，再把中间那一行挑出来（偶数个就取中间两行的平均）。',
    terms: ['median', 'window-function', 'cte'],
  },
  'win-16': {
    plain:
      '这题要的不是"最高工资是多少"，而是"拿最高工资的那个人是谁"。用 GROUP BY + MAX 拿不到人名，这正是窗口函数存在的理由。',
    terms: ['top-n', 'window-function', 'group-by'],
  },
  'win-17': {
    plain:
      '每条成绩旁边都显示"这门课的平均分"，再算出"我比平均高还是低"。难点是要保留每一行明细，同时又看到所在课程的整体水平。',
    terms: ['window-function', 'aggregate', 'partition-by'],
  },
  'win-18': {
    plain:
      '每个学生可能选了好几门课，找出他分数最高的那一门。这是"每组取第一名"的模板题。',
    terms: ['top-n', 'window-function'],
  },
  'win-19': {
    plain:
      '把每个客户的订单按时间排好，算这一单和上一单隔了几天。这是复购分析最基础的指标，靠"往前看一行"实现。',
    terms: ['lag-lead', 'datediff', 'partition-by'],
  },

  'int-01': {
    plain:
      '一个人连着好几天来登录，就算一段"连续"。要找的是连续 3 天以上的段。核心技巧很巧：把日期减去一个递增的序号，连续的日子减完结果一样，断了就变。',
    terms: ['gaps-islands', 'window-function', 'cte'],
  },
  'int-02': {
    plain:
      '还是连续登录，但这次不要每一段，只要每个人"最长的那一段有几天"。相当于在上一题结果上再取一次最大值。',
    terms: ['gaps-islands', 'window-function', 'cte'],
  },
  'int-03': {
    plain:
      '次日留存 = 今天第一次来的人里，第二天又回来的比例。要先找出每个人的"第一次登录日期"，再看第二天有没有记录。',
    terms: ['retention', 'exists', 'cte'],
  },
  'int-04': {
    plain:
      '把用户按"第一次登录的月份"分成一批一批，每批单独算次日留存。这样能看出"后面进来的用户质量有没有变差"。',
    terms: ['retention', 'cohort', 'exists'],
  },
  'int-05': {
    plain:
      '分位数比平均值更能反映真实分布。P50 是中位数，P90 说明"九成的订单都比它便宜"。先给每笔订单算出它处在第几百分位，再挑出跨过每个分位点的那一笔。',
    terms: ['percent-rank', 'window-function', 'median'],
  },
  'int-06': {
    plain:
      '把每个客户的订单按时间排好，比较这一单和上一单的金额，只留下"这次花得更多"的记录。',
    terms: ['lag-lead', 'window-function', 'cte'],
  },
  'int-07': {
    plain:
      '原始数据是一行一个订单，要变成"一行一个月份、每种状态各占一列"。就是 Excel 里的数据透视表，SQL 里靠条件聚合实现。',
    terms: ['pivot', 'conditional-aggregation', 'group-by'],
  },
  'int-08': {
    plain: '把会员等级横过来变成列，每个城市一行。和上一题同一个套路，换张表再练一遍。',
    terms: ['pivot', 'conditional-aggregation', 'count-star'],
  },
  'int-09': {
    plain:
      '5 万笔订单的中位数是多少？MySQL 没有 MEDIAN 函数，得先排序编号，再取正中间的那一行（偶数行取中间两行的平均）。',
    terms: ['median', 'window-function', 'cte'],
  },
  'int-10': {
    plain:
      '先算出每个商品卖了多少钱、排个名，取前 10，再算这 10 个商品占了全部销售额的百分之几。',
    terms: ['top-n', 'pareto', 'window-function'],
  },
  'int-11': {
    plain:
      '复购率 = 下过 2 单及以上的人 ÷ 下过单的人。注意分母只算下过单的，从没下单的人不参与这个比例。',
    terms: ['repurchase', 'cte', 'conditional-aggregation'],
  },
  'int-12': {
    plain:
      '按"下过几单"把客户分成 0 单、1 单、2-3 单、4 单以上四层，看每层多少人。注意从没下单的客户也要算一层，不能消失。',
    terms: ['case-when', 'left-join', 'group-by'],
  },
  'int-13': {
    plain:
      '"每个客户只留最新一条"是数据清洗的常见需求。做法是给每人的订单按时间倒着编号，取 1 号就是最新那单。',
    terms: ['top-n', 'window-function', 'cte'],
  },
  'int-14': {
    plain:
      '每个类目挑出最贵的商品，同时算出它占本类目总价的百分比。一条 SQL 里要同时用到"组内排名"和"组内求和"。',
    terms: ['top-n', 'window-function', 'partition-by'],
  },
  'int-15': {
    plain:
      '帕累托分析的经典问法：商品按销售额从高到低排，一路累加，加到 80% 时用掉了多少个商品？这能说明收入有多集中。',
    terms: ['pareto', 'window-function', 'cte'],
  },
  'int-16': {
    plain:
      '把客户按注册月份分成一批一批，看每批人一共下了多少单、人均几单。判断"新渠道来的客户质量有没有变差"就靠它。',
    terms: ['cohort', 'left-join', 'count-star'],
  },
  'int-17': {
    plain:
      '只看"第一单之后的 30 天"这个窗口，算有多大比例的人又下了一单。比笼统的复购率更能反映新客激活做得好不好。',
    terms: ['repurchase', 'exists', 'datediff'],
  },
  'int-18': {
    plain:
      '对每个用户，算出相邻两次登录隔了几天，再求平均。数字越小说明来得越勤。',
    terms: ['lag-lead', 'datediff', 'having'],
  },
  'int-19': {
    plain:
      '算每个部门工资占全公司的比例，只留下"高于平均水平"的部门。阈值不用固定的 10%，而是"100% ÷ 部门数"，换套数据也成立。',
    terms: ['window-function', 'execution-order', 'cte'],
  },
  'int-20': {
    plain:
      '按"最后一次登录距今多久"把客户分成活跃、沉睡、流失三层。注意"距今"得有个固定的参照日，否则每天跑出来的结果都不一样。',
    terms: ['churn', 'datediff', 'case-when'],
  },

  'idx-01': {
    plain:
      '最基础的索引场景：按客户编号查订单。5 万行的表里，某个客户只有几单——走索引的话数据库直接跳到那几行，不走索引就得从头翻到尾。',
    terms: ['sargable', 'access-type', 'explain'],
  },
  'idx-02': {
    plain:
      '在 10 万行的明细表里找某个商品的所有成交记录。这里能最直观地看出走索引和全表扫的差距——一个是碰两百行，一个是碰十万行。',
    terms: ['sargable', 'access-type', 'selectivity'],
  },
  'idx-03': {
    plain:
      '统计某个月有多少条登录记录。日期字段上有没有索引、你把它写成区间还是写成函数，决定了数据库是只翻一个月的数据，还是把 7 万行全翻一遍。',
    terms: ['sargable', 'date-format', 'access-type'],
  },
  'idx-04': {
    plain:
      '按姓名精确找人。字符串索引也是按字典序排的，等值查询能直接翻到那一页；但只要给列套个函数（比如防空格的 TRIM），就变成一页页翻了。',
    terms: ['sargable', 'collation', 'explain'],
  },
  'idx-05': {
    plain:
      '同时有"状态"和"金额"两个条件。数据库上有一个把两列合起来排的索引：先按状态排、再按金额排，所以"状态固定 + 金额在某个区间"正好能一路定位下去。',
    terms: ['composite-index', 'sargable', 'covering-index'],
  },
  'idx-06': {
    plain:
      '查一个薪资区间。范围条件写在裸列上就能用索引定位到起点然后顺序读；在列上套个 ROUND，哪怕结果没变，优化器也不认了。',
    terms: ['sargable', 'access-type', 'explain'],
  },
  'idx-07': {
    plain:
      '同一天、同一状态两个条件。索引建得好的话能直接定位到"这一天 + 已完成"这个很窄的区间；一旦用 DATE() 把日期包住，就只剩状态能用了。',
    terms: ['composite-index', 'sargable', 'access-type'],
  },
  'idx-08': {
    plain:
      '按订单号查一个区间的明细。范围查询是从起点开始顺序读、读完就停，所以只碰两百行；在列上做个没意义的加法，就变成十万行全扫。',
    terms: ['sargable', 'access-type', 'composite-index'],
  },
  'idx-09': {
    plain:
      '两个条件各有一个单列索引。数据库通常只会挑一个用，另一个只能逐行过滤——这就是"两个单列索引不等于一个复合索引"。而且挑错了比不用还慢。',
    terms: ['selectivity', 'composite-index', 'explain'],
  },
  'idx-10': {
    plain:
      '按月做报表。有意思的是：GROUP BY 里用 DATE_FORMAT 完全没问题，但 WHERE 里用 YEAR() 就会把索引废掉——两个地方长得几乎一样，代价差十倍。',
    terms: ['sargable', 'date-format', 'group-by', 'access-type'],
  },

  'dml-01': {
    plain:
      '往部门表里加一行。看着最简单，但"列和值必须一一对应"这件事，一旦省略列名就会变成定时炸弹——表结构一改，数据就插错位了。',
    terms: ['dml', 'affected-rows'],
  },
  'dml-02': {
    plain:
      '一次加三个员工。逐条写也能对，但批量写只走一次网络、只解析一次，插一千行时差别是几十毫秒和好几秒。',
    terms: ['dml', 'affected-rows', 'transaction'],
  },
  'dml-03': {
    plain:
      '给所有人涨 10% 工资。UPDATE 的右边可以引用这一行原来的值，所以不用循环，一条语句就能全部算完。',
    terms: ['dml', 'affected-rows'],
  },
  'dml-04': {
    plain:
      '把每个部门的预算改成"这个部门所有人的工资加起来"。麻烦在于有些部门一个人都没有，它们的预算得是 0，而不是保持原样——这一点决定了你用 INNER 还是 LEFT JOIN。',
    terms: ['dml', 'correlated-subquery', 'left-join'],
  },
  'dml-05': {
    plain:
      '删掉 2020 年之前入职的人。删除不可逆，所以这题真正要养成的习惯是：先把 DELETE 换成 SELECT 跑一遍，确认要删的正是你以为的那些行。',
    terms: ['dml', 'truncate', 'sargable'],
  },
  'dml-06': {
    plain:
      '删掉一个员工都没有的部门。这题埋了两个坑：员工表里有人没部门（dept_id 是 NULL），用 NOT IN 会一行都删不掉；另外外键会挡住"删还有人的部门"。',
    terms: ['dml', 'anti-join', 'not-in', 'foreign-key'],
  },
  'dml-07': {
    plain:
      '给 7 号账户加 50 块：没有这个账户就开一个，有就直接加钱。一条语句搞定"先查再决定插还是改"的两步操作。',
    terms: ['upsert', 'dml', 'affected-rows'],
  },
  'dml-08': {
    plain:
      '转账：一边扣 100，一边加 100。这两步必须绑在一起，否则中间出错就会"钱扣了没到账"。事务就是干这个的。',
    terms: ['transaction', 'dml', 'affected-rows'],
  },
};
