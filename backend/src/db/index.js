import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'wms.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const isNew = !fs.existsSync(DB_PATH);
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

if (isNew) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('[db] Esquema creado en', DB_PATH);
}

export default db;
