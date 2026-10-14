import type { PriceRecord } from "#repositories/priceHistory/types.js";

const errors = ["conflict"] as const;
export type RepositoryErrors = (typeof errors)[number];

export interface Cryptocurrency {
  id: number;
  cmcId: number;
  symbol: string;
  name: string;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  latestPrice: PriceRecord | null;
}

export interface CryptocurrencyRow {
  id: number;
  cmc_id: number;
  symbol: string;
  name: string;
  sync_enabled: 0 | 1;
  last_synced_at: string | null;
  latest_price: number | null;
  latest_fetched_at: string | null;
  latest_cmc_updated_at: string | null;
}
