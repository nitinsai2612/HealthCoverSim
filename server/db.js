const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = path.join(__dirname, 'healthcoversim.db');
const SCHEMA_FILE = path.join(__dirname, 'init.sql');

function openDatabase() {
  const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
      console.error('Failed to open database:', err.message);
      process.exit(1);
    }
  });
  db.run('PRAGMA foreign_keys = ON');
  return db;
}

const db = openDatabase();

function initialiseDatabase(callback) {
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Failed to initialise database:', err.message);
      if (callback) callback(err);
      return;
    }
    console.log(`Database initialised at ${DB_FILE}`);
    console.log('Table "quotes" created and seeded with the Section 7 worked example.');
    if (callback) callback(null);
  });
}

function ensureDatabaseReady(callback) {
  db.get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'quotes'",
    (err, row) => {
      if (err) return callback(err);
      if (row) return callback(null, false); // already exists
      console.log('No "quotes" table found - initialising from init.sql...');
      initialiseDatabase((initErr) => callback(initErr, true));
    }
  );
}

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function handler(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

if (require.main === module) {
  initialiseDatabase((err) => {
    db.close();
    process.exit(err ? 1 : 0);
  });
}

module.exports = { db, run, get, all, initialiseDatabase, ensureDatabaseReady, DB_FILE };
