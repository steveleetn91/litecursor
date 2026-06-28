import mysql from "mysql2/promise";
import "dotenv/config";
const {
  DB_HOST = "127.0.0.1",
  DB_PORT = "3310",
  DB_USER = "root",
  DB_PASSWORD = "rootpassword",
  DB_NAME = "litecursor",
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.end();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_path VARCHAR(1000) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_usages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,

      agent VARCHAR(50) NOT NULL,
      model_name VARCHAR(255) NOT NULL,

      input_text LONGTEXT NOT NULL,
      output_text LONGTEXT NOT NULL,

      prompt_tokens INT NOT NULL DEFAULT 0,
      completion_tokens INT NOT NULL DEFAULT 0,
      total_tokens INT NOT NULL DEFAULT 0,

      input_cost DECIMAL(12,6) NOT NULL DEFAULT 0,
      output_cost DECIMAL(12,6) NOT NULL DEFAULT 0,
      total_cost DECIMAL(12,6) NOT NULL DEFAULT 0,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_ai_usages_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      role VARCHAR(50) NOT NULL,
      content LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_messages_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
    )
  `);
}

const initPromise = initializeDatabase().catch((err) => {
  console.error("MySQL init failed:", err);
  process.exit(1);
});

export async function saveProject(project_path) {
  await initPromise;

  const finalProjectPath = String(project_path ?? "").trim();

  if (!finalProjectPath) {
    throw new Error("project_path is required.");
  }

  const [result] = await pool.execute(
    `
      INSERT INTO projects (project_path)
      VALUES (?)
      ON DUPLICATE KEY UPDATE project_path = VALUES(project_path)
    `,
    [finalProjectPath]
  );

  if (result.insertId) {
    return result.insertId;
  }

  const existing = await getProjectByPath(finalProjectPath);
  return existing ? existing.id : null;
}

export async function getProjectById(project_id) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    [project_id]
  );

  return rows.length >= 1 ? rows[0] : null;
}

export async function getProjectByPath(project_path) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM projects
      WHERE project_path = ?
      LIMIT 1
    `,
    [String(project_path ?? "").trim()]
  );

  return rows.length >= 1 ? rows[0] : null;
}

export async function getProjects(limit = 20) {
  await initPromise;

  const [rows] = await pool.execute(
    `SELECT * FROM projects ORDER BY id DESC LIMIT ${limit}`
  );

  return Array.isArray(rows) ? rows.reverse() : [];
}

export async function deleteProject(project_id) {
  await initPromise;

  await pool.execute(
    `
      DELETE FROM projects
      WHERE id = ?
    `,
    [project_id]
  );
}

export async function saveMessage(role, content, project_id) {
  await initPromise;
  const [result] = await pool.execute("INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)",
    [
      Number(project_id),
      role || "user",
      String(content ?? ""),
    ]
  );
  return result?.insertId;
}

export async function getMessages(limit = 20, project_id) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM messages
      WHERE project_id = ${project_id}
      ORDER BY id DESC
      LIMIT ${limit}
    `
  );

  return Array.isArray(rows) ? rows.reverse() : [];
}

export async function getLastMessage(project_id) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM messages
      WHERE project_id = ${project_id}
      ORDER BY id DESC
      LIMIT 1
    `
  );

  return rows?.length >= 1 ? rows[0] : {}
}

export async function clearMessages(project_id) {
  await initPromise;

  await pool.execute(
    `
      DELETE FROM messages
      WHERE project_id = ?
    `,
    [project_id]
  );
}

export async function saveAiUsage({
  project_id,
  agent,
  model_name,
  input_text,
  output_text,
  prompt_tokens = 0,
  completion_tokens = 0,
  total_tokens,
  input_cost = 0,
  output_cost = 0,
  total_cost,
}) {
  await initPromise;

  const finalPromptTokens = Number(prompt_tokens || 0);
  const finalCompletionTokens = Number(completion_tokens || 0);

  const finalTotalTokens =
    total_tokens !== undefined && total_tokens !== null
      ? Number(total_tokens)
      : finalPromptTokens + finalCompletionTokens;

  const finalInputCost = Number(input_cost || 0);
  const finalOutputCost = Number(output_cost || 0);

  const finalTotalCost =
    total_cost !== undefined && total_cost !== null
      ? Number(total_cost)
      : finalInputCost + finalOutputCost;

  const [result] = await pool.execute(
    `
      INSERT INTO ai_usages (
        project_id,
        agent,
        model_name,
        input_text,
        output_text,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        input_cost,
        output_cost,
        total_cost
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      project_id,
      agent || "unknown",
      model_name || "unknown",
      String(input_text ?? ""),
      String(output_text ?? ""),
      finalPromptTokens,
      finalCompletionTokens,
      finalTotalTokens,
      finalInputCost,
      finalOutputCost,
      finalTotalCost,
    ]
  );

  return result.insertId;
}

export async function getAiUsages(project_id, limit = 50) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM ai_usages
      WHERE project_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [project_id, Number(limit)]
  );

  return Array.isArray(rows) ? rows : [];
}

export async function getAiUsageById(id) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM ai_usages
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows.length >= 1 ? rows[0] : null;
}

export async function clearAiUsages(project_id) {
  await initPromise;

  await pool.execute(
    `
      DELETE FROM ai_usages
      WHERE project_id = ?
    `,
    [project_id]
  );
}

export async function getAiUsageSummary(project_id) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT
        COUNT(*) AS request_count,
        COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(input_cost), 0) AS input_cost,
        COALESCE(SUM(output_cost), 0) AS output_cost,
        COALESCE(SUM(total_cost), 0) AS total_cost
      FROM ai_usages
      WHERE project_id = ?
    `,
    [project_id]
  );

  return rows.length >= 1 ? rows[0] : null;
}

export async function getAiUsageSummaryByAgent(project_id) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT
        agent,
        COUNT(*) AS request_count,
        COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(input_cost), 0) AS input_cost,
        COALESCE(SUM(output_cost), 0) AS output_cost,
        COALESCE(SUM(total_cost), 0) AS total_cost
      FROM ai_usages
      WHERE project_id = ?
      GROUP BY agent
      ORDER BY total_cost DESC
    `,
    [project_id]
  );

  return Array.isArray(rows) ? rows : [];
}

export async function getAiUsageSummaryByModel(project_id) {
  await initPromise;

  const [rows] = await pool.execute(
    `
      SELECT
        model_name,
        COUNT(*) AS request_count,
        COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(input_cost), 0) AS input_cost,
        COALESCE(SUM(output_cost), 0) AS output_cost,
        COALESCE(SUM(total_cost), 0) AS total_cost
      FROM ai_usages
      WHERE project_id = ?
      GROUP BY model_name
      ORDER BY total_cost DESC
    `,
    [project_id]
  );

  return Array.isArray(rows) ? rows : [];
}

export { pool };