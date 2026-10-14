import { type Database, SqliteError } from "better-sqlite3";
import type { Cryptocurrency, CryptocurrencyRow } from "../types.js";
import RepositoryError from "../error.js";

export interface CreateCryptocurrency {
  cmcId: number;
  symbol: string;
  name: string;
}

function create(db: Database) {
  const insertStatment = db.prepare<[number, string, string], CryptocurrencyRow>(`
    INSERT INTO cryptocurrencies (cmc_id, symbol, name)
    VALUES (?, ?, ?)
    RETURNING id, cmc_id, symbol, name, last_synced_at
  `);

  return (data: CreateCryptocurrency): Cryptocurrency => {
    try {
      const row = insertStatment.get(data.cmcId, data.symbol, data.name);
      if (!row) throw new Error("Cryptocurrency Create: returned no row");

      return {
        id: row.id,
        cmcId: row.cmc_id,
        symbol: row.symbol,
        name: row.name,
        lastSyncedAt: row.last_synced_at,
      };
    } catch (err) {
      if (err instanceof SqliteError && err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new RepositoryError(
          "conflict",
          `Cryptocurrency Create: ${data.symbol} with id ${data.cmcId} already exists`,
        );
      }

      throw err;
    }
  };
}

export default create;
