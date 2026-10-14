const errors = ["conflict"] as const;
export type RepositoryErrors = (typeof errors)[number];

export interface Cryptocurrency {
  id: number;
  cmcId: number;
  symbol: string;
  name: string;
  lastSyncedAt: string | null;
}

export interface CryptocurrencyRow {
  id: number;
  cmc_id: number;
  symbol: string;
  name: string;
  last_synced_at: string | null;
}
