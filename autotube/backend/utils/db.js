const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/autotube.db';
let db;

function getDB() {
  if (!db) db = new Database(path.resolve(DB_PATH));
  return db;
}

async function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      niche TEXT,
      audience TEXT,
      style TEXT,
      emoji TEXT DEFAULT '📺',
      youtube_channel_id TEXT,
      avatar_id TEXT,
      voice_id TEXT,
      video_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT,
      script TEXT,
      voice_url TEXT,
      avatar_video_url TEXT,
      final_video_url TEXT,
      thumbnail_url TEXT,
      youtube_video_id TEXT,
      status TEXT DEFAULT 'pending',
      pipeline_log TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      anthropic_key TEXT,
      openai_key TEXT,
      elevenlabs_key TEXT,
      minimax_key TEXT,
      minimax_group_id TEXT,
      heygen_key TEXT,
      kling_key TEXT,
      kling_secret TEXT,
      runway_key TEXT,
      fal_key TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pipeline_jobs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      channel_id INTEGER,
      video_id INTEGER,
      status TEXT DEFAULT 'queued',
      steps TEXT DEFAULT '[]',
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log('✅ Database initialized');
  return db;
}

module.exports = { getDB, initDB };
