import type { Cryptocurrency, CryptocurrencyRow } from "./types.js";

const toCryptocurrency = (row: CryptocurrencyRow): Cryptocurrency => ({
  id: row.id,
  cmcId: row.cmc_id,
  symbol: row.symbol,
  name: row.name,
  lastSyncedAt: row.last_synced_at,
});

export default toCryptocurrency;
