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
      balance REAL DEFAULT 500,
      referredBy TEXT DEFAULT NULL,
      xp INTEGER DEFAULT 0,
      level TEXT DEFAULT 'Bronze',
      highestMultiplier REAL DEFAULT 0
    )
  `);

  // Handle SQLite schema migrations safely if columns don't exist yet
  try {
    await dbInstance.exec('ALTER TABLE users ADD COLUMN referredBy TEXT DEFAULT NULL');
  } catch (e) {}
  try {
    await dbInstance.exec('ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0');
  } catch (e) {}
  try {
    await dbInstance.exec("ALTER TABLE users ADD COLUMN level TEXT DEFAULT 'Bronze'");
  } catch (e) {}
  try {
    await dbInstance.exec("ALTER TABLE users ADD COLUMN highestMultiplier REAL DEFAULT 0");
  } catch (e) {}

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS system_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  return dbInstance;
}
