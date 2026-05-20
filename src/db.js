import mysql from "mysql2/promise";

const {
  DB_HOST = "127.0.0.1",
  DB_PORT = "3310",
  DB_USER = "root",
  DB_PASSWORD = "rootpassword",
  DB_NAME = "litecursor"
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.end();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

const initPromise = initializeDatabase().catch((err) => {
  console.error("MySQL init failed:", err);
  process.exit(1);
});

export async function saveMessage(role, content) {
  await initPromise;
  if (!role) role = "user";
  if (content === undefined || content === null) content = "";

  await pool.execute(
    "INSERT INTO messages (role, content) VALUES (?, ?)",
    [role, String(content)]
  );
}

export async function getMessages(limit = 20) {
  await initPromise;
  const [rows] = await pool.execute(
    `SELECT role, content FROM messages ORDER BY id DESC LIMIT 20`
  );

  return Array.isArray(rows) ? rows.reverse() : [];
}

export async function clearMessages() {
  await initPromise;
  await pool.execute("DELETE FROM messages");
}
