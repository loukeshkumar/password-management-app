const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('\n  ERROR: DATABASE_URL is not set.');
  console.error('  Create a .env file in the project root with:');
  console.error('  DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>\n');
  process.exit(1);
}

// Parse the URL so pg always receives the password as an explicit string,
// which avoids the "client password must be a string" SASL error when
// DATABASE_URL is malformed or partially undefined.
const dbUrl = new URL(process.env.DATABASE_URL);

const pool = new Pool({
  host:     dbUrl.hostname,
  port:     Number(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),          // strip leading "/"
  user:     decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_config (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      kdf_salt      TEXT NOT NULL,
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_credentials (
      id           SERIAL PRIMARY KEY,
      website_name TEXT NOT NULL,
      website_url  TEXT,
      category     TEXT DEFAULT 'general',
      username     TEXT NOT NULL,
      password     TEXT NOT NULL,
      notes        TEXT,
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS card_details (
      id               SERIAL PRIMARY KEY,
      bank_name        TEXT,
      card_network     TEXT,
      card_type        TEXT DEFAULT 'debit',
      card_holder_name TEXT NOT NULL,
      card_number      TEXT NOT NULL,
      expiry_date      TEXT NOT NULL,
      cvv              TEXT NOT NULL,
      pin              TEXT NOT NULL,
      created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id                   SERIAL PRIMARY KEY,
      bank_name            TEXT NOT NULL,
      branch_name          TEXT,
      account_type         TEXT DEFAULT 'savings',
      account_holder_name  TEXT NOT NULL,
      account_number       TEXT NOT NULL,
      ifsc_code            TEXT NOT NULL,
      net_banking_username TEXT,
      net_banking_password TEXT,
      created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('PostgreSQL tables ready.');
}

module.exports = { pool, initDb };
