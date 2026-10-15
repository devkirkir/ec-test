import HttpError from "#lib/httpError.js";

import parseSymbol from "../utils/parseSymbol.js";
import rejectUnknownKeys from "../utils/rejectUnknownKeys.js";

import type { CoinMarketCap } from "#integrations/coinmarketcap/index.js";
import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { Cryptocurrency } from "#repositories/cryptocurrencies/types.js";
import type { PriceHistoryRepository } from "#repositories/priceHistory/index.js";
import type { PriceRecord } from "#repositories/priceHistory/types.js";
import type { Request, Response } from "express";

interface Deps {
  cmc: CoinMarketCap;
  cryptocurrencies: CryptocurrenciesRepository;
  priceHistory: PriceHistoryRepository;
  currency: string;
}

type PriceSource = "history" | "coinmarketcap";

interface PriceResponse extends PriceRecord {
  symbol: string;
  currency: string;
  source: PriceSource;
}

const price = (deps: Deps) => async (req: Request<{ symbol: string }>, res: Response<PriceResponse>) => {
  rejectUnknownKeys(req.query, [], "query params");

  const symbol = parseSymbol(req.params.symbol);

  const cryptocurrency = deps.cryptocurrencies.findBySymbol(symbol);
  if (!cryptocurrency) throw new HttpError(404, `Cryptocurrency ${symbol} not found`);

  if (!cryptocurrency.syncEnabled || !cryptocurrency.lastSyncedAt) {
    const live = await fetchLivePrice(deps.cmc, cryptocurrency);

    return res.json({ symbol, currency: deps.currency, source: "coinmarketcap", ...live });
  }

  const latest = deps.priceHistory.findLatest(cryptocurrency.id);
  if (!latest) throw new HttpError(404, `Price for ${symbol} is not available yet`);

  res.json({ symbol, currency: deps.currency, source: "history", ...latest });
};

async function fetchLivePrice(cmc: CoinMarketCap, cryptocurrency: Cryptocurrency): Promise<PriceRecord> {
  const { quotes } = await cmc.getPrice([cryptocurrency.cmcId]);

  const quote = quotes.find((quote) => quote.id === cryptocurrency.cmcId);
  if (!quote) throw new HttpError(502, `CoinMarketCap returned no price for ${cryptocurrency.symbol}`);

  return {
    price: quote.price,
    fetchedAt: new Date().toISOString(),
    cmcUpdatedAt: quote.lastUpdated.toISOString(),
  };
}

export default price;
