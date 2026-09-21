import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'wms.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const isNew = !fs.existsSync(DB_PATH);
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

if (isNew) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('[db] Esquema creado en', DB_PATH);
}

// node:sqlite (a diferencia de better-sqlite3) no trae un helper .transaction();
// esta función envuelve varias operaciones en BEGIN/COMMIT/ROLLBACK manualmente.
export function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export default db;
