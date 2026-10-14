import CoinMarketCapError from "#integrations/coinmarketcap/errors/error.js";

import HttpError from "#lib/httpError.js";
import { isObject } from "#lib/validators/index.js";

import type { CmcCoin } from "#integrations/coinmarketcap/types.js";
import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { Request, Response } from "express";
import type { Cryptocurrency } from "#repositories/cryptocurrencies/types.js";
import type { CoinMarketCap } from "#integrations/coinmarketcap/index.js";

interface Deps {
  cmc: CoinMarketCap;
  cryptocurrencies: CryptocurrenciesRepository;
}

const observe =
  (deps: Deps) =>
  async (req: Request<Record<string, never>, Cryptocurrency, unknown>, res: Response<Cryptocurrency>) => {
    const { symbol } = parseBody(req.body);

    let coins: CmcCoin[];

    try {
      coins = await deps.cmc.checkSymbol(symbol);
    } catch (err) {
      if (err instanceof CoinMarketCapError && err.errorType === "bad_request") {
        throw new HttpError(404, `Cryptocurrency ${symbol} not found`);
      }

      throw err;
    }

    const coin = coins.filter((coin) => coin.isActive).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))[0];
    if (!coin) throw new HttpError(404, `Cryptocurrency ${symbol} has no active coins`);

    const created = deps.cryptocurrencies.create({ cmcId: coin.id, symbol, name: coin.name });

    res.status(201).json(created);
  };

const SYMBOL_PATTERN = /^[A-Z0-9]{1,10}$/;

function parseBody(body: unknown): { symbol: string } {
  if (!isObject(body)) throw new HttpError(400, "Body must be an object");

  const { symbol } = body;
  if (typeof symbol !== "string") throw new HttpError(400, "symbol must be a string");

  const normalized = symbol.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(normalized)) {
    throw new HttpError(400, "symbol must be 1-10 latin letters or digits");
  }

  return { symbol: normalized };
}

export default observe;
