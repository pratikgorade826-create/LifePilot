const path = require('path');
const fs = require('fs');
const env = require('./env');

let sqliteDB = null;

const initSQLite = () => {
  if (sqliteDB) return sqliteDB;

  try {
    const { DatabaseSync } = require('node:sqlite');
    const rawPath = env.SQLITE_PATH || './data/lifepilot.sqlite3';
    const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(__dirname, '../../', rawPath);
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    sqliteDB = new DatabaseSync(dbPath);

    // Initialize core schema
    sqliteDB.exec(`
      CREATE TABLE IF NOT EXISTS lifepilot_documents (
        collection_name TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (collection_name, id)
      );
      CREATE INDEX IF NOT EXISTS idx_lifepilot_col ON lifepilot_documents (collection_name);
      CREATE INDEX IF NOT EXISTS idx_lifepilot_id ON lifepilot_documents (id);
    `);

    console.log(`[SQLite3] Database initialized successfully at: ${dbPath}`);
    return sqliteDB;
  } catch (err) {
    console.warn(`[SQLite3] Could not initialize native node:sqlite (${err.message}), falling back to memory/file storage.`);
    return null;
  }
};

const getSQLiteDB = () => {
  if (!sqliteDB) return initSQLite();
  return sqliteDB;
};

module.exports = { initSQLite, getSQLiteDB };
