import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 500
    )
  `);

  return dbInstance;
}
