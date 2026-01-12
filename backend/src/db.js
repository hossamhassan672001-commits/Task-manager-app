import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "task_manager",
  port: Number(process.env.DB_PORT || 3306),
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10)
});

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function healthcheck() {
  await pool.query("SELECT 1");
}
