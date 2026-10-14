import toCryptocurrency from "../toCryptocurrency.js";
import { SELECT_CRYPTOCURRENCY } from "../selectCryptocurrency.js";

import { type Database } from "better-sqlite3";
import type { Cryptocurrency, CryptocurrencyRow } from "../types.js";

function findAll(db: Database) {
  const selectStatment = db.prepare<[], CryptocurrencyRow>(`
    ${SELECT_CRYPTOCURRENCY}
    ORDER BY c.id
  `);

  return (): Cryptocurrency[] => selectStatment.all().map(toCryptocurrency);
}

export default findAll;
