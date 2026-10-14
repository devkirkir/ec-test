import findBySymbol from "./findBySymbol.js";

import { type Database } from "better-sqlite3";
import type { Cryptocurrency } from "../types.js";

export interface UpdateCryptocurrency {
  syncEnabled: boolean;
}

function update(db: Database) {
  const updateStatment = db.prepare<[number, string]>(`
    UPDATE cryptocurrencies
    SET sync_enabled = ?
    WHERE symbol = ?
  `);

  const find = findBySymbol(db);

  return (symbol: string, data: UpdateCryptocurrency): Cryptocurrency | null => {
    const { changes } = updateStatment.run(data.syncEnabled ? 1 : 0, symbol);

    return changes > 0 ? find(symbol) : null;
  };
}

export default update;
