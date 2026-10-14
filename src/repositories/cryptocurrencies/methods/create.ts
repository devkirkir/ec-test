import { type Database, SqliteError } from "better-sqlite3";
import type { Cryptocurrency, CryptocurrencyRow } from "../types.js";
import RepositoryError from "../error.js";
import toCryptocurrency from "../toCryptocurrency.js";
import { SELECT_CRYPTOCURRENCY } from "../selectCryptocurrency.js";

export interface CreateCryptocurrency {
  cmcId: number;
  symbol: string;
  name: string;
}

function create(db: Database) {
  const insertStatment = db.prepare<[number, string, string]>(`
    INSERT INTO cryptocurrencies (cmc_id, symbol, name)
    VALUES (?, ?, ?)
  `);

  const selectStatment = db.prepare<[number | bigint], CryptocurrencyRow>(`
    ${SELECT_CRYPTOCURRENCY}
    WHERE c.id = ?
  `);

  return (data: CreateCryptocurrency): Cryptocurrency => {
    try {
      const { lastInsertRowid } = insertStatment.run(data.cmcId, data.symbol, data.name);

      const row = selectStatment.get(lastInsertRowid);
      if (!row) throw new Error("Cryptocurrency Create: returned no row");

      return toCryptocurrency(row);
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
