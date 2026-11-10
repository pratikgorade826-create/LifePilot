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

      -- Relational Views for DB Browser for SQLite & SQLite Viewers
      CREATE VIEW IF NOT EXISTS users AS
        SELECT id,
               json_extract(data, '$.name') AS name,
               json_extract(data, '$.email') AS email,
               json_extract(data, '$.role') AS role,
               json_extract(data, '$.bio') AS bio,
               json_extract(data, '$.theme') AS theme,
               created_at, updated_at
        FROM lifepilot_documents WHERE collection_name = 'users';

      CREATE VIEW IF NOT EXISTS trips AS
        SELECT id,
               json_extract(data, '$.title') AS title,
               json_extract(data, '$.destination') AS destination,
               json_extract(data, '$.durationDays') AS durationDays,
               json_extract(data, '$.travelersCount') AS travelersCount,
               json_extract(data, '$.totalBudget') AS totalBudget,
               json_extract(data, '$.status') AS status,
               created_at
        FROM lifepilot_documents WHERE collection_name = 'trips';

      CREATE VIEW IF NOT EXISTS projects AS
        SELECT id,
               json_extract(data, '$.title') AS title,
               json_extract(data, '$.description') AS description,
               json_extract(data, '$.status') AS status,
               json_extract(data, '$.progress') AS progress,
               created_at
        FROM lifepilot_documents WHERE collection_name = 'projects';

      CREATE VIEW IF NOT EXISTS tasks AS
        SELECT id,
               json_extract(data, '$.title') AS title,
               json_extract(data, '$.status') AS status,
               json_extract(data, '$.priority') AS priority,
               json_extract(data, '$.dueDate') AS dueDate,
               created_at
        FROM lifepilot_documents WHERE collection_name = 'tasks';

      CREATE VIEW IF NOT EXISTS notifications AS
        SELECT id,
               json_extract(data, '$.title') AS title,
               json_extract(data, '$.message') AS message,
               json_extract(data, '$.type') AS type,
               json_extract(data, '$.read') AS isRead,
               created_at
        FROM lifepilot_documents WHERE collection_name = 'notifications';

      CREATE VIEW IF NOT EXISTS conversations AS
        SELECT id,
               json_extract(data, '$.title') AS title,
               json_extract(data, '$.category') AS category,
               created_at, updated_at
        FROM lifepilot_documents WHERE collection_name = 'conversations';

      CREATE VIEW IF NOT EXISTS messages AS
        SELECT id,
               json_extract(data, '$.conversationId') AS conversationId,
               json_extract(data, '$.role') AS role,
               json_extract(data, '$.content') AS content,
               created_at
        FROM lifepilot_documents WHERE collection_name = 'messages';
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
