const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'vault.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS master_config (
    id   INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    kdf_salt      TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS login_credentials (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    website_name TEXT NOT NULL,
    website_url  TEXT,
    category     TEXT DEFAULT 'general',
    username     TEXT NOT NULL,
    password     TEXT NOT NULL,
    notes        TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS card_details (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name        TEXT,
    card_network     TEXT,
    card_type        TEXT DEFAULT 'debit',
    card_holder_name TEXT NOT NULL,
    card_number      TEXT NOT NULL,
    expiry_date      TEXT NOT NULL,
    cvv              TEXT NOT NULL,
    pin              TEXT NOT NULL,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bank_accounts (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name            TEXT NOT NULL,
    branch_name          TEXT,
    account_type         TEXT DEFAULT 'savings',
    account_holder_name  TEXT NOT NULL,
    account_number       TEXT NOT NULL,
    ifsc_code            TEXT NOT NULL,
    net_banking_username TEXT,
    net_banking_password TEXT,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
