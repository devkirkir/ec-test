import HttpError from "#lib/httpError.js";

import parseSymbol from "../utils/parseSymbol.js";

import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { PriceHistoryRepository } from "#repositories/priceHistory/index.js";
import type { PriceRecord } from "#repositories/priceHistory/types.js";
import type { Request, Response } from "express";

interface Deps {
  cryptocurrencies: CryptocurrenciesRepository;
  priceHistory: PriceHistoryRepository;
  currency: string;
}

interface PriceResponse extends PriceRecord {
  symbol: string;
  currency: string;
}

const price = (deps: Deps) => (req: Request<{ symbol: string }>, res: Response<PriceResponse>) => {
  const symbol = parseSymbol(req.params.symbol);

  const cryptocurrency = deps.cryptocurrencies.findBySymbol(symbol);
  if (!cryptocurrency) throw new HttpError(404, `Cryptocurrency ${symbol} not found`);

  const latest = deps.priceHistory.findLatest(cryptocurrency.id);
  if (!latest) throw new HttpError(404, `Price for ${symbol} is not available yet`);

  res.json({ symbol, currency: deps.currency, ...latest });
};

export default price;
