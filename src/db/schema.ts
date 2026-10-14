import type { Database } from "better-sqlite3";

export function applySchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cryptocurrencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cmc_id INTEGER NOT NULL UNIQUE,
      symbol VARCHAR(10) NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sync_enabled INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT,
  
      CONSTRAINT bool_sync_enabled CHECK (sync_enabled IN (0, 1)),
      CONSTRAINT symbol_length CHECK (length(symbol) BETWEEN 1 AND 10),
      CONSTRAINT upper_symbol CHECK (symbol = upper(symbol))
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cryptocurrency_id INTEGER NOT NULL,
      price REAL NOT NULL,
      fetched_at TEXT NOT NULL,
      cmc_updated_at TEXT NOT NULL,

      CONSTRAINT positive_price CHECK (price >= 0),
      CONSTRAINT unique_crypto_cmc_updated UNIQUE (cryptocurrency_id, cmc_updated_at),
      
      FOREIGN KEY (cryptocurrency_id) REFERENCES cryptocurrencies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_crypto_fetched ON price_history (cryptocurrency_id, fetched_at);
  `);
}
