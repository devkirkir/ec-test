import toCryptocurrency from "../toCryptocurrency.js";

import { type Database } from "better-sqlite3";
import type { Cryptocurrency, CryptocurrencyRow } from "../types.js";

function findAll(db: Database) {
  const selectStatment = db.prepare<[], CryptocurrencyRow>(`
    SELECT id, cmc_id, symbol, name, last_synced_at
    FROM cryptocurrencies
    ORDER BY id
  `);

  return (): Cryptocurrency[] => selectStatment.all().map(toCryptocurrency);
}

export default findAll;
