import HttpError from "#lib/httpError.js";

import parseSymbol from "../utils/parseSymbol.js";
import parseHistoryQuery from "../utils/parseHistoryQuery.js";

import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { PriceHistoryRepository } from "#repositories/priceHistory/index.js";
import type { PriceRecord } from "#repositories/priceHistory/types.js";
import type { Request, Response } from "express";

interface Deps {
  cryptocurrencies: CryptocurrenciesRepository;
  priceHistory: PriceHistoryRepository;
  currency: string;
}

interface HistoryResponse {
  symbol: string;
  currency: string;
  items: PriceRecord[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

const history = (deps: Deps) => (req: Request<{ symbol: string }>, res: Response<HistoryResponse>) => {
  const symbol = parseSymbol(req.params.symbol);
  const filters = parseHistoryQuery(req.query);

  const cryptocurrency = deps.cryptocurrencies.findBySymbol(symbol);
  if (!cryptocurrency) throw new HttpError(404, `Cryptocurrency ${symbol} not found`);

  const { items, total } = deps.priceHistory.findByCryptocurrency(cryptocurrency.id, filters);

  res.json({
    symbol,
    currency: deps.currency,
    items,
    pagination: { limit: filters.limit, offset: filters.offset, total },
  });
};

export default history;
