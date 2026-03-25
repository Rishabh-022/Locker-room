const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron'); // Make sure this line is here!

// If you are running this in the MAIN process, this will work:
const dbPath = path.join(app.getPath('userData'), 'locker-room.db');
const db = new Database(dbPath);

// ===== CREATE TABLES =====

// 1. Users table with recovery_password
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    recovery_password TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    storage_used INTEGER DEFAULT 0,
    storage_total INTEGER DEFAULT 5368709120
  )
`).run();

// 2. Real passwords table (for main vault)
db.prepare(`
  CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    site TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// 3. Decoy passwords table (for emergency/recovery mode)
db.prepare(`
  CREATE TABLE IF NOT EXISTS decoy_passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    site TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// 4. Real notes table
db.prepare(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// 5. Decoy notes table (for emergency mode)
db.prepare(`
  CREATE TABLE IF NOT EXISTS decoy_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// 6. Real files table
db.prepare(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT,
    path TEXT,
    is_deleted INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// 7. Decoy files table (for emergency mode)
db.prepare(`
  CREATE TABLE IF NOT EXISTS decoy_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT,
    path TEXT,
    is_deleted INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// ===== CREATE INDEXES FOR BETTER PERFORMANCE =====
db.prepare(`CREATE INDEX IF NOT EXISTS idx_passwords_user_id ON passwords(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_passwords_is_deleted ON passwords(is_deleted)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_passwords_is_favorite ON passwords(is_favorite)`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_passwords_user_id ON decoy_passwords(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_passwords_is_deleted ON decoy_passwords(is_deleted)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_passwords_is_favorite ON decoy_passwords(is_favorite)`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_notes_is_deleted ON notes(is_deleted)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite)`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_notes_user_id ON decoy_notes(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_notes_is_deleted ON decoy_notes(is_deleted)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_notes_is_favorite ON decoy_notes(is_favorite)`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(is_favorite)`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_files_user_id ON decoy_files(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_files_is_deleted ON decoy_files(is_deleted)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_decoy_files_is_favorite ON decoy_files(is_favorite)`).run();

console.log('✅ Database initialized successfully with dual-vault support');
console.log('📁 Tables created: users, passwords, decoy_passwords, notes, decoy_notes, files, decoy_files');
console.log('⭐ Added is_deleted and is_favorite columns to all data tables');

module.exports = db;