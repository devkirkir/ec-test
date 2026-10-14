import HttpError from "#lib/httpError.js";

import parseSymbol from "../utils/parseSymbol.js";
import rejectUnknownKeys from "../utils/rejectUnknownKeys.js";

import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { Request, Response } from "express";

interface Deps {
  cryptocurrencies: CryptocurrenciesRepository;
}

const unobserve = (deps: Deps) => (req: Request<{ symbol: string }>, res: Response) => {
  rejectUnknownKeys(req.query, [], "query params");

  const symbol = parseSymbol(req.params.symbol);

  const removed = deps.cryptocurrencies.remove(symbol);
  if (!removed) throw new HttpError(404, `Cryptocurrency ${symbol} not found`);

  res.status(204).end();
};

export default unobserve;
