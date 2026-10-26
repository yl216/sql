import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

const HOST = process.env.DB_HOST || '127.0.0.1';
const PORT = Number(process.env.DB_PORT || 3306);
const USER = process.env.DB_USER || 'root';
const PASSWORD = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '';
const RO_USER = 'sqlprac_ro';
const RO_PASS = 'SqlPrac_ro_2026';
const RW_USER = 'sqlprac_rw';
const RW_PASS = 'SqlPrac_rw_2026';

const DBS = {
  company: 'sqlprac_company',
  companyHid: 'sqlprac_company_hid',
  shop: 'sqlprac_shop',
  shopHid: 'sqlprac_shop_hid',
  school: 'sqlprac_school',
  schoolHid: 'sqlprac_school_hid',
  sandbox: 'sqlprac_sandbox',
  sandboxTpl: 'sqlprac_sandbox_tpl',
  sandboxTplHid: 'sqlprac_sandbox_tpl_hid',
};

// ---------- 确定性随机 ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(20261024);
const ri = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜'.split('');
const GIVEN = '伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超秀霞平刚桂英建华文博宇轩雨欣'.split('');
function personName() {
  return pick(SURNAMES) + pick(GIVEN) + (rnd() < 0.45 ? pick(GIVEN) : '');
}
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '苏州'];
const DEPT_NAMES = ['研发部', '产品部', '设计部', '市场部', '销售部', '运营部', '财务部', '人力资源部', '法务部', '客服部', '数据部', '供应链部'];
const TITLES = ['工程师', '高级工程师', '技术专家', '经理', '总监', '专员', '助理'];
const TITLE_BASE = { 助理: 6000, 专员: 9000, 工程师: 15000, 高级工程师: 24000, 技术专家: 38000, 经理: 30000, 总监: 55000 };
const CATEGORIES = ['数码', '家电', '服饰', '食品', '图书', '美妆', '运动', '家居'];
const ORDER_STATUS = ['completed', 'completed', 'completed', 'completed', 'pending', 'cancelled', 'refunded'];

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtDateTime(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${fmtDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function randDate(startISO, endISO) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return new Date(s + Math.floor(rnd() * (e - s)));
}

// ---------- 建表 DDL ----------
const DDL_COMPANY = `
CREATE TABLE departments (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  budget DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  dept_id INT NULL,
  manager_id INT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  title VARCHAR(30) NOT NULL,
  KEY idx_emp_dept (dept_id),
  KEY idx_emp_salary (salary),
  KEY idx_emp_name (name),
  CONSTRAINT fk_emp_dept FOREIGN KEY (dept_id) REFERENCES departments(id),
  CONSTRAINT fk_emp_mgr FOREIGN KEY (manager_id) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE projects (
  id INT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  dept_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  budget DECIMAL(12,2) NOT NULL,
  KEY idx_proj_dept (dept_id),
  CONSTRAINT fk_proj_dept FOREIGN KEY (dept_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE employee_projects (
  employee_id INT NOT NULL,
  project_id INT NOT NULL,
  role VARCHAR(30) NOT NULL,
  hours INT NOT NULL,
  PRIMARY KEY (employee_id, project_id),
  KEY idx_ep_proj (project_id),
  CONSTRAINT fk_ep_emp FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_ep_proj FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;
`;

const DDL_SHOP = `
CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  signup_date DATE NOT NULL,
  level VARCHAR(10) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  category VARCHAR(30) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_date DATETIME NOT NULL,
  status VARCHAR(12) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  KEY idx_orders_status_date (status, order_date),
  KEY idx_orders_customer_date (customer_id, order_date),
  KEY idx_orders_date (order_date),
  KEY idx_orders_status_amount (status, total_amount),
  CONSTRAINT fk_ord_cust FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  KEY idx_items_order (order_id),
  KEY idx_items_product (product_id),
  CONSTRAINT fk_item_ord FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_item_prod FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE login_log (
  id INT PRIMARY KEY,
  customer_id INT NOT NULL,
  login_date DATE NOT NULL,
  UNIQUE KEY uk_login_cust_date (customer_id, login_date),
  KEY idx_login_date (login_date),
  CONSTRAINT fk_login_cust FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;
`;

const DDL_SCHOOL = `
CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  gender VARCHAR(4) NOT NULL,
  class_name VARCHAR(20) NOT NULL,
  enroll_year INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE courses (
  id INT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  teacher VARCHAR(50) NOT NULL,
  credit DECIMAL(3,1) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE scores (
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  score DECIMAL(5,2) NULL,
  exam_date DATE NOT NULL,
  PRIMARY KEY (student_id, course_id),
  KEY idx_scores_course (course_id),
  CONSTRAINT fk_sc_stu FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_sc_course FOREIGN KEY (course_id) REFERENCES courses(id)
) ENGINE=InnoDB;
`;

async function bulk(conn, table, cols, rows, batch = 800) {
  const colList = cols.join(',');
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const ph = chunk.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
    await conn.query(`INSERT INTO ${table} (${colList}) VALUES ${ph}`, chunk.flat());
  }
}

// ---------- company ----------
async function seedCompany(conn, dbName, opts) {
  const { nDept, nEmp, nProj, nLink, edge } = opts;
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName} DEFAULT CHARSET utf8mb4`);
  await conn.query(`USE ${dbName}`);
  for (const stmt of DDL_COMPANY.split(';').map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);

  const depts = [];
  for (let i = 1; i <= nDept; i++) {
    depts.push([i, DEPT_NAMES[(i - 1) % DEPT_NAMES.length] + (i > 12 ? i : ''), pick(CITIES), ri(200000, 3000000)]);
  }
  await bulk(conn, 'departments', ['id', 'name', 'city', 'budget'], depts);

  const emps = [];
  for (let i = 1; i <= nEmp; i++) {
    const title = pick(TITLES);
    const base = TITLE_BASE[title];
    // 薪资取整到 500，制造大量并列，便于考 DENSE_RANK
    const salary = Math.round((base * (0.7 + rnd() * 0.7)) / 500) * 500;
    // 保留少量未分配部门的员工，让 IS NULL / 三值逻辑的题有数据可练
    const deptId = edge && i <= 6 ? null : rnd() < 0.024 ? null : ri(1, nDept);
    emps.push([
      i,
      personName(),
      deptId,
      i > 20 && rnd() < 0.3 ? ri(1, i - 1) : null,
      fmtDate(randDate('2015-01-01', '2025-09-30')),
      salary,
      title,
    ]);
  }
  await bulk(conn, 'employees', ['id', 'name', 'dept_id', 'manager_id', 'hire_date', 'salary', 'title'], emps);

  const projs = [];
  for (let i = 1; i <= nProj; i++) {
    const s = randDate('2022-01-01', '2025-06-30');
    const ended = rnd() < 0.6;
    projs.push([
      i,
      `项目-${String(i).padStart(3, '0')}`,
      ri(1, nDept),
      fmtDate(s),
      ended ? fmtDate(new Date(s.getTime() + ri(30, 400) * 86400000)) : null,
      ri(50000, 2000000),
    ]);
  }
  await bulk(conn, 'projects', ['id', 'name', 'dept_id', 'start_date', 'end_date', 'budget'], projs);

  const seen = new Set();
  const links = [];
  while (links.length < nLink) {
    const e = ri(1, nEmp);
    const p = ri(1, nProj);
    const k = `${e}-${p}`;
    if (seen.has(k)) continue;
    seen.add(k);
    links.push([e, p, pick(['开发', '测试', '设计', '需求', '评审']), ri(5, 400)]);
  }
  await bulk(conn, 'employee_projects', ['employee_id', 'project_id', 'role', 'hours'], links);

  return { employees: nEmp, projects: nProj };
}

// ---------- 登录日志 ----------
// 按"会话"生成：每个客户有若干段连续登录，段与段之间隔几天。
// 这样既天然产生"连续 N 天登录"，也能算出有意义的次日留存。
function genLoginLog(nCust, edge) {
  const seen = new Set();
  const rows = [];
  let id = 1;
  const add = (c, dstr) => {
    const k = `${c}|${dstr}`;
    if (seen.has(k)) return;
    seen.add(k);
    rows.push([id++, c, dstr]);
  };
  for (let c = 1; c <= nCust; c++) {
    const nSessions = ri(1, 5);
    for (let s = 0; s < nSessions; s++) {
      const start = randDate('2024-01-01T00:00:00', '2025-11-15T00:00:00');
      const r = rnd();
      const len = r < 0.45 ? 1 : r < 0.75 ? ri(2, 3) : r < 0.93 ? ri(4, 7) : ri(8, 14);
      for (let d = 0; d < len; d++) add(c, fmtDate(new Date(start.getTime() + d * 86400000)));
    }
  }
  if (edge) {
    // 隐藏集里造几条明确的长连续段，用来验证"最长连续天数"
    for (const c of [1, 2, 3]) {
      const base = new Date('2025-06-01T00:00:00');
      for (let d = 0; d < 18; d++) add(c, fmtDate(new Date(base.getTime() + d * 86400000)));
    }
  }
  return rows;
}

// ---------- shop ----------
async function seedShop(conn, dbName, opts) {
  const { nCust, nProd, nOrder, itemsPerOrder, edge } = opts;
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName} DEFAULT CHARSET utf8mb4`);
  await conn.query(`USE ${dbName}`);
  for (const stmt of DDL_SHOP.split(';').map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);

  const custs = [];
  for (let i = 1; i <= nCust; i++) {
    custs.push([i, personName(), pick(CITIES), fmtDate(randDate('2022-01-01', '2025-09-30')), pick(['普通', '普通', '白银', '黄金', '钻石'])]);
  }
  await bulk(conn, 'customers', ['id', 'name', 'city', 'signup_date', 'level'], custs);

  const prods = [];
  for (let i = 1; i <= nProd; i++) {
    const price = ri(10, 5000) + 0.9;
    prods.push([i, `商品-${String(i).padStart(4, '0')}`, pick(CATEGORIES), price, Math.round(price * (0.4 + rnd() * 0.3) * 100) / 100]);
  }
  await bulk(conn, 'products', ['id', 'name', 'category', 'price', 'cost'], prods);

  const orders = [];
  const items = [];
  let itemId = 1;
  for (let i = 1; i <= nOrder; i++) {
    const d = randDate('2023-01-01T00:00:00', '2025-12-31T23:59:59');
    orders.push([i, ri(1, nCust), fmtDateTime(d), pick(ORDER_STATUS), 0]);
    const cnt = ri(1, itemsPerOrder * 2 - 1);
    for (let j = 0; j < cnt; j++) {
      const pid = ri(1, nProd);
      const qty = ri(1, 4);
      items.push([itemId++, i, pid, qty, prods[pid - 1][3]]);
    }
  }
  // 边界数据：2024-03-01 00:00:00 / 2024-03-31 23:59:59
  if (edge) {
    orders.push([nOrder + 1, 1, '2024-03-01 00:00:00', 'completed', 0]);
    orders.push([nOrder + 2, 1, '2024-03-31 23:59:59', 'completed', 0]);
    orders.push([nOrder + 3, 1, '2024-04-01 00:00:00', 'completed', 0]);
    for (const oid of [nOrder + 1, nOrder + 2, nOrder + 3]) items.push([itemId++, oid, 1, 1, 99.9]);
  }
  await bulk(conn, 'orders', ['id', 'customer_id', 'order_date', 'status', 'total_amount'], orders);
  await bulk(conn, 'order_items', ['id', 'order_id', 'product_id', 'qty', 'unit_price'], items);

  await conn.query(`UPDATE orders o JOIN (SELECT order_id, SUM(qty * unit_price) s FROM order_items GROUP BY order_id) t
                    ON o.id = t.order_id SET o.total_amount = t.s`);
  await conn.query(`ANALYZE TABLE orders, order_items`);

  const logins = genLoginLog(nCust, edge);
  await bulk(conn, 'login_log', ['id', 'customer_id', 'login_date'], logins);
  await conn.query(`ANALYZE TABLE login_log`);

  return { customers: nCust, orders: orders.length, order_items: items.length, login_log: logins.length };
}

// ---------- school ----------
async function seedSchool(conn, dbName, opts) {
  const { nStu, nCourse, nScore, edge } = opts;
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName} DEFAULT CHARSET utf8mb4`);
  await conn.query(`USE ${dbName}`);
  for (const stmt of DDL_SCHOOL.split(';').map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);

  const stus = [];
  for (let i = 1; i <= nStu; i++) {
    stus.push([i, personName(), rnd() < 0.5 ? '男' : '女', `${2021 + (i % 4)}级${(i % 6) + 1}班`, 2021 + (i % 4)]);
  }
  await bulk(conn, 'students', ['id', 'name', 'gender', 'class_name', 'enroll_year'], stus);

  const courses = [];
  const SUBJECTS = ['数据库原理', '数据结构', '操作系统', '计算机网络', '高等数学', '线性代数', '统计学', '机器学习'];
  for (let i = 1; i <= nCourse; i++) {
    courses.push([i, `${SUBJECTS[(i - 1) % SUBJECTS.length]}${i > 8 ? '-' + i : ''}`, personName(), [1.0, 1.5, 2.0, 2.5, 3.0][ri(0, 4)]]);
  }
  await bulk(conn, 'courses', ['id', 'name', 'teacher', 'credit'], courses);

  const seen = new Set();
  const scores = [];
  while (scores.length < nScore) {
    const s = ri(1, nStu);
    const c = ri(1, nCourse);
    const k = `${s}-${c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    // 缺考记为 NULL
    const val = edge && scores.length % 97 === 0 ? null : rnd() < 0.02 ? null : Math.min(100, Math.round((45 + rnd() * 55) * 10) / 10);
    scores.push([s, c, val, fmtDate(randDate('2023-06-01', '2025-06-30'))]);
  }
  await bulk(conn, 'scores', ['student_id', 'course_id', 'score', 'exam_date'], scores);

  return { students: nStu, courses: nCourse, scores: nScore };
}

// ---------- DML 沙盒 ----------
// 小数据集，每次判题前从模板整表重建，所以行数越少越快。
const DDL_SANDBOX = `
CREATE TABLE dept (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  budget DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE emp (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  dept_id INT NULL,
  salary DECIMAL(10,2) NOT NULL,
  hired DATE NOT NULL,
  KEY idx_sb_emp_dept (dept_id),
  CONSTRAINT fk_sb_emp_dept FOREIGN KEY (dept_id) REFERENCES dept(id)
) ENGINE=InnoDB;

CREATE TABLE account (
  id INT PRIMARY KEY,
  owner VARCHAR(50) NOT NULL,
  balance DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB;
`;

const SANDBOX_DATA = {
  main: {
    depts: [
      [1, '研发部', 800000],
      [2, '市场部', 300000],
      [3, '销售部', 450000],
      [4, '财务部', 200000],
      [5, '人事部', 150000],
      [6, '法务部', 120000],
      [7, '客服部', 180000],
      [8, '数据部', 260000],
    ],
    // dept_id 落在 1..7，故意让 8 号部门没有员工
    // 40 号员工故意没有部门，用来制造 NOT IN + NULL 的陷阱
    empDept: (i) => (i === 40 ? null : (i % 7) + 1),
    empSalary: (i) => (i % 3 === 0 ? 6000 + i * 100 : 8000 + i * 350),
    empYear: (i) => 2015 + (i % 10),
    accounts: [
      [1, '张三', 1000],
      [2, '李四', 500],
      [3, '王五', 2000],
      [4, '赵六', 300],
      [5, '孙七', 1500],
      [6, '周八', 800],
    ],
  },
  hid: {
    depts: [
      [1, '部门A', 520000],
      [2, '部门B', 610000],
      [3, '部门C', 380000],
      [4, '部门D', 240000],
      [5, '部门E', 330000],
      [6, '部门F', 175000],
      [7, '部门G', 460000],
      [8, '部门H', 290000],
    ],
    // 这次 dept_id 落在 2..8，1 号部门没有员工
    empDept: (i) => (i === 40 ? null : (i % 7) + 2),
    empSalary: (i) => (i % 4 === 0 ? 5500 + i * 80 : 9000 + i * 300),
    empYear: (i) => 2016 + (i % 9),
    // 隐藏集里 id=7 的账户已经存在，用来区分 UPSERT 和裸 INSERT
    accounts: [
      [1, 'Alice', 2400],
      [2, 'Bob', 1200],
      [3, 'Cara', 600],
      [4, 'Dan', 900],
      [5, 'Eve', 3000],
      [6, 'Finn', 450],
      [7, 'Gina', 700],
    ],
  },
};

async function seedSandbox(conn, dbName, variant) {
  const d = SANDBOX_DATA[variant];
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName} DEFAULT CHARSET utf8mb4`);
  await conn.query(`USE ${dbName}`);
  for (const stmt of DDL_SANDBOX.split(';').map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);

  await bulk(conn, 'dept', ['id', 'name', 'budget'], d.depts);

  const emps = [];
  for (let i = 1; i <= 40; i++) {
    const year = d.empYear(i);
    const mm = String((i % 12) + 1).padStart(2, '0');
    const dd = String((i % 28) + 1).padStart(2, '0');
    emps.push([i, `员工${String(i).padStart(2, '0')}`, d.empDept(i), d.empSalary(i), `${year}-${mm}-${dd}`]);
  }
  await bulk(conn, 'emp', ['id', 'name', 'dept_id', 'salary', 'hired'], emps);

  await bulk(conn, 'account', ['id', 'owner', 'balance'], d.accounts);

  return { depts: d.depts.length, emps: emps.length, accounts: d.accounts.length };
}

async function main() {
  const conn = await mysql.createConnection({ host: HOST, port: PORT, user: USER, password: PASSWORD, multipleStatements: false });
  console.log('已连接 MySQL');

  for (const db of Object.values(DBS)) {
    await conn.query(`DROP DATABASE IF EXISTS ${db}`);
  }

  rnd = mulberry32(20261024);
  console.log('生成 company（公开集）...');
  console.log('  ', await seedCompany(conn, DBS.company, { nDept: 12, nEmp: 5000, nProj: 200, nLink: 12000, edge: false }));

  rnd = mulberry32(777001);
  console.log('生成 company（隐藏集）...');
  console.log('  ', await seedCompany(conn, DBS.companyHid, { nDept: 10, nEmp: 4200, nProj: 80, nLink: 10000, edge: true }));

  rnd = mulberry32(20261025);
  console.log('生成 shop（公开集）...');
  console.log('  ', await seedShop(conn, DBS.shop, { nCust: 8000, nProd: 500, nOrder: 50000, itemsPerOrder: 2, edge: false }));

  rnd = mulberry32(777002);
  console.log('生成 shop（隐藏集）...');
  console.log('  ', await seedShop(conn, DBS.shopHid, { nCust: 500, nProd: 60, nOrder: 3000, itemsPerOrder: 2, edge: true }));

  rnd = mulberry32(20261026);
  console.log('生成 school（公开集）...');
  console.log('  ', await seedSchool(conn, DBS.school, { nStu: 3000, nCourse: 60, nScore: 20000, edge: false }));

  rnd = mulberry32(777003);
  console.log('生成 school（隐藏集）...');
  console.log('  ', await seedSchool(conn, DBS.schoolHid, { nStu: 300, nCourse: 20, nScore: 1500, edge: true }));

  console.log('生成 DML 沙盒（公开模板 / 隐藏模板 / 工作库）...');
  console.log('   main', await seedSandbox(conn, DBS.sandboxTpl, 'main'));
  console.log('   hid ', await seedSandbox(conn, DBS.sandboxTplHid, 'hid'));
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${DBS.sandbox} DEFAULT CHARSET utf8mb4`);

  // 只读账号
  for (const host of ['localhost', '127.0.0.1', '%']) {
    await conn.query(`CREATE USER IF NOT EXISTS '${RO_USER}'@'${host}' IDENTIFIED BY '${RO_PASS}'`);
    await conn.query(`ALTER USER '${RO_USER}'@'${host}' IDENTIFIED BY '${RO_PASS}'`);
    for (const db of Object.values(DBS)) {
      if (db === DBS.sandbox) continue;
      await conn.query(`GRANT SELECT ON ${db}.* TO '${RO_USER}'@'${host}'`);
    }
  }

  // 可写账号：只能在沙盒里折腾，碰不到其它库
  for (const host of ['localhost', '127.0.0.1', '%']) {
    await conn.query(`CREATE USER IF NOT EXISTS '${RW_USER}'@'${host}' IDENTIFIED BY '${RW_PASS}'`);
    await conn.query(`ALTER USER '${RW_USER}'@'${host}' IDENTIFIED BY '${RW_PASS}'`);
    await conn.query(`GRANT ALL PRIVILEGES ON ${DBS.sandbox}.* TO '${RW_USER}'@'${host}'`);
    await conn.query(`GRANT SELECT ON ${DBS.sandboxTpl}.* TO '${RW_USER}'@'${host}'`);
    await conn.query(`GRANT SELECT ON ${DBS.sandboxTplHid}.* TO '${RW_USER}'@'${host}'`);
  }
  await conn.query(`FLUSH PRIVILEGES`);

  const envPath = path.join(import.meta.dirname, '..', '.env');
  const envBody = [
    `DB_HOST=${HOST}`,
    `DB_PORT=${PORT}`,
    `DB_USER=${USER}`,
    `DB_PASSWORD=${PASSWORD}`,
    `DB_RO_USER=${RO_USER}`,
    `DB_RO_PASSWORD=${RO_PASS}`,
    `DB_RW_USER=${RW_USER}`,
    `DB_RW_PASSWORD=${RW_PASS}`,
    `PORT=3001`,
    '',
  ].join('\n');
  fs.writeFileSync(envPath, envBody, 'utf8');
  console.log(`\n已写入 ${envPath}`);

  await conn.end();
  console.log('灌数据完成');
}

main().catch((e) => {
  console.error('灌数据失败:', e);
  process.exit(1);
});
