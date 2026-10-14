import toPriceRecord from "../toPriceRecord.js";

import { type Database } from "better-sqlite3";
import type { HistoryFilters, HistoryOrder, PriceRecord, PriceRow } from "../types.js";

interface RangeParams {
  cryptocurrencyId: number;
  from: string | null;
  to: string | null;
}

export interface HistoryPage {
  items: PriceRecord[];
  total: number;
}

const RANGE_CONDITION = `
  cryptocurrency_id = @cryptocurrencyId
  AND (@from IS NULL OR fetched_at >= @from)
  AND (@to IS NULL OR fetched_at <= @to)
`;

function findByCryptocurrency(db: Database) {
  const selectStatments: Record<HistoryOrder, ReturnType<typeof prepareSelect>> = {
    asc: prepareSelect(db, "ASC"),
    desc: prepareSelect(db, "DESC"),
  };

  const countStatment = db.prepare<[RangeParams], { total: number }>(`
    SELECT COUNT(*) AS total
    FROM price_history
    WHERE ${RANGE_CONDITION}
  `);

  return (cryptocurrencyId: number, filters: HistoryFilters): HistoryPage => {
    const range: RangeParams = {
      cryptocurrencyId,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
    };

    const readTransaction = db.transaction(() => ({
      items: selectStatments[filters.order]
        .all({ ...range, limit: filters.limit, offset: filters.offset })
        .map(toPriceRecord),
      total: countStatment.get(range)?.total ?? 0,
    }));

    return readTransaction();
  };
}

function prepareSelect(db: Database, direction: "ASC" | "DESC") {
  return db.prepare<[RangeParams & { limit: number; offset: number }], PriceRow>(`
    SELECT price, fetched_at, cmc_updated_at
    FROM price_history
    WHERE ${RANGE_CONDITION}
    ORDER BY fetched_at ${direction}, id ${direction}
    LIMIT @limit OFFSET @offset
  `);
}

export default findByCryptocurrency;
