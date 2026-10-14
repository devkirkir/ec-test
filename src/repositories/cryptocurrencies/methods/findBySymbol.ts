import toCryptocurrency from "../toCryptocurrency.js";

import { type Database } from "better-sqlite3";
import type { Cryptocurrency, CryptocurrencyRow } from "../types.js";

function findBySymbol(db: Database) {
  const selectStatment = db.prepare<[string], CryptocurrencyRow>(`
    SELECT id, cmc_id, symbol, name, last_synced_at
    FROM cryptocurrencies
    WHERE symbol = ?
  `);

  return (symbol: string): Cryptocurrency | null => {
    const row = selectStatment.get(symbol);

    return row ? toCryptocurrency(row) : null;
  };
}

export default findBySymbol;
