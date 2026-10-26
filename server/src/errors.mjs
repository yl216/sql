// 把常见 MySQL 报错翻译成看得懂的话。新手 80% 的卡点就在这几个码上。
const MESSAGES = {
  1055: {
    title: 'SELECT 列表里有既不在 GROUP BY 里、也不是聚合函数的列',
    hint: 'MySQL 5.7 起默认开启 ONLY_FULL_GROUP_BY。要么把这个列加进 GROUP BY，要么给它套一个聚合函数（如 MAX()/ANY_VALUE()）。',
  },
  1140: {
    title: '聚合查询里混用了非聚合列',
    hint: '你在没有 GROUP BY 的查询里同时用了 COUNT/SUM 和普通列。加上 GROUP BY，或者去掉那个普通列。',
  },
  1242: {
    title: '子查询返回了多行',
    hint: '把 = 换成 IN，或者在子查询里加 LIMIT 1 / 聚合函数让它只返回一行。',
  },
  1064: {
    title: 'SQL 语法错误',
    hint: '检查引号是否配对、关键字是否拼错、是不是漏了逗号或括号。错误信息里的 near 后面就是解析失败的位置。',
  },
  1054: {
    title: '字段名不存在',
    hint: '检查列名拼写，以及这个列是否在你查询的表里。用了别名时要用别名，不能用原表名。',
  },
  1146: {
    title: '表不存在',
    hint: '检查表名拼写，注意当前题目绑定的是哪个库。',
  },
  1066: {
    title: '列名重复',
    hint: '两个表 JOIN 后有同名列，用 AS 给其中一个起别名。',
  },
  3065: {
    title: 'ORDER BY 的列不在 SELECT 列表里',
    hint: '用了 DISTINCT 或 UNION 时，排序字段必须出现在 SELECT 里。',
  },
  3024: {
    title: '查询超时',
    hint: '单次查询上限 8 秒。检查是不是漏了 JOIN 条件导致笛卡尔积，或者扫描了整张大表。',
  },
  1093: {
    title: '不能在子查询里直接更新同一张表',
    hint: '把子查询包一层派生表：UPDATE t JOIN (SELECT ...) x ON ...。',
  },
  1062: {
    title: '主键或唯一键冲突',
    hint: '要插入的 id 已经存在了。想"有则更新、无则插入"用 INSERT ... ON DUPLICATE KEY UPDATE，别用裸 INSERT。',
  },
  1451: {
    title: '外键约束：这条记录正被别的表引用',
    hint: '被引用的父行不能直接删。要么先删子表里引用它的行，要么在建表时声明 ON DELETE CASCADE。',
  },
  1452: {
    title: '外键约束：引用的父行不存在',
    hint: '你插入的子行指向了一个不存在的父 id。先插父表，再插子表。',
  },
  1048: {
    title: '这一列不允许为 NULL',
    hint: 'INSERT 时漏了这一列，或者显式给了 NULL。要么补上值，要么在建表时给它 DEFAULT。',
  },
  1136: {
    title: '列数和值的个数对不上',
    hint: 'INSERT INTO t (a, b) VALUES (1) 这种，括号里的列数和 VALUES 里的值数必须一样。',
  },
  1264: {
    title: '数值超出列的范围',
    hint: '比如往 DECIMAL(10,2) 里塞了过大的数。检查数据类型和精度。',
  },
  1406: {
    title: '数据太长，超出列宽',
    hint: '字符串比 VARCHAR(n) 的 n 还长。要么截短，要么改表结构。',
  },
  1292: {
    title: '日期/数字格式不正确',
    hint: '字符串转成日期失败。检查是不是 \'2024-13-01\' 这种非法日期，或者用了斜杠格式。',
  },
  1364: {
    title: '这一列没有默认值',
    hint: 'INSERT 时没给这一列赋值，而它既不允许 NULL 也没默认值。',
  },
};

export function translateError(err) {
  const code = err?.errno;
  const known = MESSAGES[code];
  if (known) {
    return { code, title: known.title, hint: known.hint, raw: err.sqlMessage || err.message };
  }
  if (err?.code === 'ER_QUERY_TIMEOUT' || /max_execution_time|Query execution was interrupted/i.test(err?.message || '')) {
    return { code: 3024, ...MESSAGES[3024], raw: err.sqlMessage || err.message };
  }
  if (err?.code === 'ER_NO_SUCH_TABLE') {
    return { code: 1146, ...MESSAGES[1146], raw: err.sqlMessage };
  }
  return {
    code: code || null,
    title: '执行失败',
    hint: '看下面的原始报错信息定位问题。',
    raw: err?.sqlMessage || err?.message || String(err),
  };
}

const WRITE_KEYWORDS = /\b(insert|update|delete|replace|drop|truncate|alter|create|grant|revoke|rename)\b/i;

export function guardSql(sql) {
  const trimmed = (sql || '').trim();
  if (!trimmed) return { ok: false, message: 'SQL 不能为空' };
  if (trimmed.length > 8000) return { ok: false, message: 'SQL 太长（上限 8000 字符）' };

  // 去掉字符串字面量和注释后再检测多语句 / 写操作
  const stripped = trimmed
    .replace(/'(?:[^'\\]|\\.|'')*'/g, "''")
    .replace(/"(?:[^"\\]|\\.|"")*"/g, '""')
    .replace(/`[^`]*`/g, '``')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/#[^\n]*/g, ' ');

  const body = stripped.replace(/;\s*$/, '');
  if (body.includes(';')) {
    return { ok: false, message: '一次只能执行一条语句（检测到多条）' };
  }
  if (WRITE_KEYWORDS.test(body)) {
    return { ok: false, message: '练习模式为只读，不支持增删改和 DDL 语句' };
  }
  return { ok: true };
}

const DML_FORBIDDEN = /\b(drop\s+database|create\s+database|grant|revoke|shutdown|flush)\b/i;

// DML 题的护栏：允许增删改，只挡住动整个库和权限的操作
export function guardDml(sql) {
  const trimmed = (sql || '').trim();
  if (!trimmed) return { ok: false, message: 'SQL 不能为空' };
  if (trimmed.length > 8000) return { ok: false, message: 'SQL 太长（上限 8000 字符）' };

  const stripped = trimmed
    .replace(/'(?:[^'\\]|\\.|'')*'/g, "''")
    .replace(/"(?:[^"\\]|\\.|"")*"/g, '""')
    .replace(/`[^`]*`/g, '``')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/#[^\n]*/g, ' ');

  if (DML_FORBIDDEN.test(stripped)) {
    return { ok: false, message: '这里只支持增删改查，不支持 DROP/CREATE DATABASE、GRANT 这类操作' };
  }
  return { ok: true };
}
