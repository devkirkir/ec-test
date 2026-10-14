import type { PriceRecord, PriceRow } from "./types.js";

const toPriceRecord = (row: PriceRow): PriceRecord => ({
  price: row.price,
  fetchedAt: row.fetched_at,
  cmcUpdatedAt: row.cmc_updated_at,
});

export default toPriceRecord;
