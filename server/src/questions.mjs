import { BASIC } from './questions/basic.mjs';
import { AGGREGATE } from './questions/aggregate.mjs';
import { JOINS } from './questions/join.mjs';
import { WINDOW } from './questions/window.mjs';
import { INTERVIEW } from './questions/interview.mjs';
import { INDEXES } from './questions/indexes.mjs';
import { DML } from './questions/dml.mjs';
import { EXPLAIN } from './questions/explain.mjs';
import { TERMS } from './questions/glossary.mjs';

export const SCHEMAS = {
  company: {
    label: '公司人事库',
    db: 'sqlprac_company',
    hidDb: 'sqlprac_company_hid',
    intro: '一个虚构公司的组织架构：部门、员工（含上下级）、项目、员工参与项目。',
    tables: [
      {
        name: 'departments',
        desc: '部门',
        rows: 12,
        columns: [
          ['id', 'INT', '部门编号，主键'],
          ['name', 'VARCHAR(50)', '部门名称'],
          ['city', 'VARCHAR(50)', '所在城市'],
          ['budget', 'DECIMAL(12,2)', '年度预算'],
        ],
      },
      {
        name: 'employees',
        desc: '员工',
        rows: 5000,
        columns: [
          ['id', 'INT', '员工编号，主键'],
          ['name', 'VARCHAR(50)', '姓名'],
          ['dept_id', 'INT', '所属部门，可为 NULL（有 119 人未分配部门）'],
          ['manager_id', 'INT', '直属上级的员工编号，可为 NULL'],
          ['hire_date', 'DATE', '入职日期'],
          ['salary', 'DECIMAL(10,2)', '月薪'],
          ['title', 'VARCHAR(30)', '职级：工程师/高级工程师/技术专家/经理/总监/专员/助理'],
        ],
      },
      {
        name: 'projects',
        desc: '项目',
        rows: 200,
        columns: [
          ['id', 'INT', '项目编号，主键'],
          ['name', 'VARCHAR(60)', '项目名'],
          ['dept_id', 'INT', '负责部门'],
          ['start_date', 'DATE', '开始日期'],
          ['end_date', 'DATE', '结束日期，进行中为 NULL'],
          ['budget', 'DECIMAL(12,2)', '项目预算'],
        ],
      },
      {
        name: 'employee_projects',
        desc: '员工参与项目',
        rows: 12000,
        columns: [
          ['employee_id', 'INT', '员工编号'],
          ['project_id', 'INT', '项目编号'],
          ['role', 'VARCHAR(30)', '在项目中的角色'],
          ['hours', 'INT', '投入工时'],
        ],
        note: '联合主键 (employee_id, project_id)，不是所有员工都有项目',
      },
    ],
  },
  shop: {
    label: '电商订单库',
    db: 'sqlprac_shop',
    hidDb: 'sqlprac_shop_hid',
    intro: '一个电商平台的交易数据：客户、商品、订单、订单明细。',
    tables: [
      {
        name: 'customers',
        desc: '客户',
        rows: 8000,
        columns: [
          ['id', 'INT', '客户编号，主键'],
          ['name', 'VARCHAR(50)', '姓名'],
          ['city', 'VARCHAR(50)', '城市'],
          ['signup_date', 'DATE', '注册日期'],
          ['level', 'VARCHAR(10)', '会员等级：普通/白银/黄金/钻石'],
        ],
      },
      {
        name: 'products',
        desc: '商品',
        rows: 500,
        columns: [
          ['id', 'INT', '商品编号，主键'],
          ['name', 'VARCHAR(60)', '商品名'],
          ['category', 'VARCHAR(30)', '类目'],
          ['price', 'DECIMAL(10,2)', '售价'],
          ['cost', 'DECIMAL(10,2)', '成本'],
        ],
      },
      {
        name: 'orders',
        desc: '订单',
        rows: 50000,
        columns: [
          ['id', 'INT', '订单号，主键'],
          ['customer_id', 'INT', '下单客户'],
          ['order_date', 'DATETIME', '下单时间'],
          ['status', 'VARCHAR(12)', 'completed / pending / cancelled / refunded'],
          ['total_amount', 'DECIMAL(12,2)', '订单总额'],
        ],
        note: '已建索引 idx_orders_status_date (status, order_date)、idx_orders_date (order_date)',
      },
      {
        name: 'order_items',
        desc: '订单明细',
        rows: 100094,
        columns: [
          ['id', 'INT', '明细编号，主键'],
          ['order_id', 'INT', '所属订单'],
          ['product_id', 'INT', '商品'],
          ['qty', 'INT', '数量'],
          ['unit_price', 'DECIMAL(10,2)', '成交单价'],
        ],
      },
      {
        name: 'login_log',
        desc: '登录日志',
        rows: 70473,
        columns: [
          ['id', 'INT', '日志编号，主键'],
          ['customer_id', 'INT', '客户编号'],
          ['login_date', 'DATE', '登录日期'],
        ],
        note: '每人每天最多一条记录（唯一索引 customer_id + login_date），日期范围 2024-01-01 至 2025-11-26',
      },
    ],
  },
  school: {
    label: '教务成绩库',
    db: 'sqlprac_school',
    hidDb: 'sqlprac_school_hid',
    intro: '学生选课与成绩数据，适合练分组、排名、多对多关联。',
    tables: [
      {
        name: 'students',
        desc: '学生',
        rows: 3000,
        columns: [
          ['id', 'INT', '学号，主键'],
          ['name', 'VARCHAR(50)', '姓名'],
          ['gender', 'VARCHAR(4)', '性别'],
          ['class_name', 'VARCHAR(20)', '班级'],
          ['enroll_year', 'INT', '入学年份'],
        ],
      },
      {
        name: 'courses',
        desc: '课程',
        rows: 60,
        columns: [
          ['id', 'INT', '课程号，主键'],
          ['name', 'VARCHAR(60)', '课程名'],
          ['teacher', 'VARCHAR(50)', '任课教师'],
          ['credit', 'DECIMAL(3,1)', '学分'],
        ],
      },
      {
        name: 'scores',
        desc: '成绩',
        rows: 20000,
        columns: [
          ['student_id', 'INT', '学号'],
          ['course_id', 'INT', '课程号'],
          ['score', 'DECIMAL(5,2)', '分数，缺考为 NULL（共 391 条）'],
          ['exam_date', 'DATE', '考试日期'],
        ],
        note: '联合主键 (student_id, course_id)，score 有 NULL 值',
      },
    ],
  },
  sandbox: {
    label: 'DML 沙盒库',
    db: 'sqlprac_sandbox',
    hidDb: 'sqlprac_sandbox',
    intro: '专门用来练增删改的小库。每次提交前都会重置回初始状态，随便改，改坏了也不影响别的库。',
    tables: [
      {
        name: 'dept',
        desc: '部门',
        rows: 8,
        columns: [
          ['id', 'INT', '部门编号，主键'],
          ['name', 'VARCHAR(50)', '部门名称'],
          ['budget', 'DECIMAL(12,2)', '部门预算'],
        ],
      },
      {
        name: 'emp',
        desc: '员工',
        rows: 40,
        columns: [
          ['id', 'INT', '员工编号，主键'],
          ['name', 'VARCHAR(50)', '姓名'],
          ['dept_id', 'INT', '所属部门，可为 NULL（40 号员工没有部门）'],
          ['salary', 'DECIMAL(10,2)', '月薪'],
          ['hired', 'DATE', '入职日期'],
        ],
        note: 'dept_id 有外键指向 dept.id；不能删还有员工的部门',
      },
      {
        name: 'account',
        desc: '账户',
        rows: 6,
        columns: [
          ['id', 'INT', '账户编号，主键'],
          ['owner', 'VARCHAR(50)', '户名'],
          ['balance', 'DECIMAL(12,2)', '余额'],
        ],
        note: '用来练事务和 UPSERT',
      },
    ],
  },
};

export const QUESTIONS = [...BASIC, ...AGGREGATE, ...JOINS, ...WINDOW, ...INTERVIEW, ...INDEXES, ...DML].map((q) => {
  const e = EXPLAIN[q.id] || {};
  return { ...q, plain: e.plain || '', terms: e.terms || [] };
});

export const GLOSSARY = TERMS;

export function resolveTerms(keys = []) {
  return keys.filter((k) => TERMS[k]).map((k) => ({ key: k, ...TERMS[k] }));
}

export function findQuestion(id) {
  return QUESTIONS.find((q) => q.id === id);
}

export function publicQuestion(q) {
  const { reference, solutions, plain, terms, ...rest } = q;
  return rest;
}
