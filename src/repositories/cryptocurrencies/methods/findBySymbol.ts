import toCryptocurrency from "../toCryptocurrency.js";
import { SELECT_CRYPTOCURRENCY } from "../selectCryptocurrency.js";

import { type Database } from "better-sqlite3";
import type { Cryptocurrency, CryptocurrencyRow } from "../types.js";

function findBySymbol(db: Database) {
  const selectStatment = db.prepare<[string], CryptocurrencyRow>(`
    ${SELECT_CRYPTOCURRENCY}
    WHERE c.symbol = ?
  `);

  return (symbol: string): Cryptocurrency | null => {
    const row = selectStatment.get(symbol);

    return row ? toCryptocurrency(row) : null;
  };
}

export default findBySymbol;
