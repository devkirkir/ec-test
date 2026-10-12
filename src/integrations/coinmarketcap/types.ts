const errors = ["canceled", "timeout", "bad_request", "auth", "server_error", "rate_limit", "invalid_response", "global"] as const;
export type CmcErrors = (typeof errors)[number];

export interface CmcCoin {
  id: number;
  symbol: string;
  name: string;
  rank: number | null;
  isActive: boolean;
}

export interface CmcQuote {
  id: number;
  symbol: string;
  price: number;
  lastUpdated: Date;
}

export interface CmcPrices {
  quotes: CmcQuote[];
  missing: number[];
}
