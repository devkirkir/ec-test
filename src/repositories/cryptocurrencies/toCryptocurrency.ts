import type { Cryptocurrency, CryptocurrencyRow } from "./types.js";

const toCryptocurrency = (row: CryptocurrencyRow): Cryptocurrency => ({
  id: row.id,
  cmcId: row.cmc_id,
  symbol: row.symbol,
  name: row.name,
  syncEnabled: row.sync_enabled === 1,
  lastSyncedAt: row.last_synced_at,
  latestPrice:
    row.latest_price !== null && row.latest_fetched_at !== null && row.latest_cmc_updated_at !== null
      ? { price: row.latest_price, fetchedAt: row.latest_fetched_at, cmcUpdatedAt: row.latest_cmc_updated_at }
      : null,
});

export default toCryptocurrency;
