import HttpError from "#lib/httpError.js";

import parseSymbol from "../utils/parseSymbol.js";

import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { Request, Response } from "express";
import type { Cryptocurrency } from "#repositories/cryptocurrencies/types.js";

interface Deps {
  cryptocurrencies: CryptocurrenciesRepository;
}

const getOne = (deps: Deps) => (req: Request<{ symbol: string }>, res: Response<Cryptocurrency>) => {
  const symbol = parseSymbol(req.params.symbol);

  const cryptocurrency = deps.cryptocurrencies.findBySymbol(symbol);
  if (!cryptocurrency) throw new HttpError(404, `Cryptocurrency ${symbol} not found`);

  res.json(cryptocurrency);
};

export default getOne;
