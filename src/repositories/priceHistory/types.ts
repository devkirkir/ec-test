export type HistoryOrder = "asc" | "desc";

export interface HistoryFilters {
  order: HistoryOrder;
  limit: number;
  offset: number;
  from?: Date | undefined;
  to?: Date | undefined;
}

export interface PriceRecord {
  price: number;
  fetchedAt: string;
  cmcUpdatedAt: string;
}

export interface PriceRow {
  price: number;
  fetched_at: string;
  cmc_updated_at: string;
}
