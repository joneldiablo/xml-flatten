import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'xml-flatten.db');

let db: SqlJsDatabase | null = null;
let initialized = false;

export async function getDb(): Promise<SqlJsDatabase> {
  if (!db) {
    const SQL = await initSqlJs();
    
    let data: Buffer | null = null;
    if (fs.existsSync(DB_PATH)) {
      data = fs.readFileSync(DB_PATH);
    }
    
    db = data ? new SQL.Database(data) : new SQL.Database();
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: SqlJsDatabase): void {
  if (initialized) return;
  
  database.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.run(`
    CREATE TABLE IF NOT EXISTS flattened_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_uuid TEXT NOT NULL,
      path TEXT NOT NULL,
      value TEXT,
      type TEXT,
      FOREIGN KEY (document_uuid) REFERENCES documents(uuid)
    )
  `);
  
  database.run(`CREATE INDEX IF NOT EXISTS idx_flattened_uuid ON flattened_data(document_uuid)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_flattened_path ON flattened_data(path)`);
  
  initialized = true;
  saveDb(database);
}

export function saveDb(database?: SqlJsDatabase): void {
  const dbToSave = database || db;
  if (dbToSave) {
    const data = dbToSave.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function closeDb(): void {
  if (db) {
    saveDb(db);
    db.close();
    db = null;
    initialized = false;
  }
}

export function queryAll(sql: string, params: any[] = []): any[] {
  if (!db) return [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function run(sql: string, params: any[] = []): void {
  if (!db) return;
  db.run(sql, params);
  saveDb(db);
}

export default { getDb, closeDb, queryAll, run, saveDb };