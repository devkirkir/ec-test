import toPriceRecord from "../toPriceRecord.js";

import { type Database } from "better-sqlite3";
import type { PriceRecord, PriceRow } from "../types.js";

function findLatest(db: Database) {
  const selectStatment = db.prepare<[number], PriceRow>(`
    SELECT price, fetched_at, cmc_updated_at
    FROM price_history
    WHERE cryptocurrency_id = ?
    ORDER BY fetched_at DESC, id DESC
    LIMIT 1
  `);

  return (cryptocurrencyId: number): PriceRecord | null => {
    const row = selectStatment.get(cryptocurrencyId);

    return row ? toPriceRecord(row) : null;
  };
}

export default findLatest;
