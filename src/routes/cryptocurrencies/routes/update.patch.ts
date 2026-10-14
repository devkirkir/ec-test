import HttpError from "#lib/httpError.js";
import { isObject } from "#lib/validators/index.js";

import parseSymbol from "../utils/parseSymbol.js";
import rejectUnknownKeys from "../utils/rejectUnknownKeys.js";

import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { UpdateCryptocurrency } from "#repositories/cryptocurrencies/methods/update.js";
import type { Cryptocurrency } from "#repositories/cryptocurrencies/types.js";
import type { Request, Response } from "express";

interface Deps {
  cryptocurrencies: CryptocurrenciesRepository;
}

const ALLOWED_FIELDS = ["syncEnabled"];

const update = (deps: Deps) => (req: Request<{ symbol: string }>, res: Response<Cryptocurrency>) => {
  rejectUnknownKeys(req.query, [], "query params");

  const symbol = parseSymbol(req.params.symbol);
  const data = parseBody(req.body);

  const updated = deps.cryptocurrencies.update(symbol, data);
  if (!updated) throw new HttpError(404, `Cryptocurrency ${symbol} not found`);

  res.json(updated);
};

function parseBody(body: unknown): UpdateCryptocurrency {
  if (!isObject(body)) throw new HttpError(400, "Body must be an object");

  rejectUnknownKeys(body, ALLOWED_FIELDS, "fields");

  if (typeof body.syncEnabled !== "boolean") throw new HttpError(400, "syncEnabled must be a boolean");

  return { syncEnabled: body.syncEnabled };
}

export default update;
