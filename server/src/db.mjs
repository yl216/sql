import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(import.meta.dirname, '..', '.env') });

export const DB_NAME = {
  company: 'sqlprac_company',
  company_hid: 'sqlprac_company_hid',
  shop: 'sqlprac_shop',
  shop_hid: 'sqlprac_shop_hid',
  school: 'sqlprac_school',
  school_hid: 'sqlprac_school_hid',
};

const base = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  connectionLimit: 6,
  dateStrings: true,
  supportBigNumbers: true,
  charset: 'utf8mb4',
};

export const roPool = mysql.createPool({
  ...base,
  user: process.env.DB_RO_USER || 'sqlprac_ro',
  password: process.env.DB_RO_PASSWORD || 'SqlPrac_ro_2026',
});

// 可写账号：只能在 sqlprac_sandbox 里折腾。multipleStatements 是为了支持事务题。
export const rwPool = mysql.createPool({
  ...base,
  user: process.env.DB_RW_USER || 'sqlprac_rw',
  password: process.env.DB_RW_PASSWORD || 'SqlPrac_rw_2026',
  database: 'sqlprac_sandbox',
  multipleStatements: true,
  connectionLimit: 4,
});

export async function withConn(pool, fn) {
  const conn = await pool.getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}
