import { isDate, isPositiveInteger, isObject, isString } from "#lib/validators/index.js";
import CoinMarketCapError from "./errors/error.js";
import type { CmcCoin, CmcPrices, CmcQuote } from "./types.js";

const invalid = (reason: string) =>
  new CoinMarketCapError("invalid_response", `CoinMarketCap: Invalid response, ${reason}`);

function getDataArray(body: unknown): unknown[] {
  if (!isObject(body)) throw invalid("body is not an object");
  if (!Array.isArray(body.data)) throw invalid("data is not an array");

  return body.data;
}

function parseCoin(item: unknown, path: string): CmcCoin {
  if (!isObject(item)) throw invalid(`${path} is not an object`);

  const { id, symbol, name, is_active } = item;

  const rank = "cmc_rank" in item ? item.cmc_rank : item.rank;

  if (!isPositiveInteger(id)) throw invalid(`${path}.id is not a positive integer`);
  if (!isString(symbol)) throw invalid(`${path}.symbol is not a string`);
  if (!isString(name)) throw invalid(`${path}.name is not a string`);
  if (rank !== null && !isPositiveInteger(rank)) throw invalid(`${path}.rank is not a positive integer or null`);
  if (is_active !== 0 && is_active !== 1) throw invalid(`${path}.is_active is not 0 or 1`);

  return { id, symbol, name, rank, isActive: is_active === 1 };
}

export function checkSymbolValidator(body: unknown, symbol: string): CmcCoin[] {
  const data = getDataArray(body);
  if (data.length === 0) throw invalid("data is empty");

  return data.map((item, i) => {
    const coin = parseCoin(item, `data[${i}]`);
    if (coin.symbol.toUpperCase() !== symbol.toUpperCase()) {
      throw invalid(`data[${i}].symbol "${coin.symbol}" does not match requested "${symbol}"`);
    }

    return coin;
  });
}

function parseQuote(item: unknown, path: string, currency: string): CmcQuote | null {
  const coin = parseCoin(item, path);
  const { quote } = item as Record<string, unknown>;

  if (!Array.isArray(quote)) throw invalid(`${path}.quote is not an array`);

  const index = quote.findIndex((q) => isObject(q) && q.symbol === currency);
  const target: unknown = quote[index];
  if (!isObject(target)) throw invalid(`${path}.quote has no ${currency} entry`);

  const quotePath = `${path}.quote[${index}]`;
  const { price, last_updated } = target;

  if (price === null) return null;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw invalid(`${quotePath}.price is not a positive number`);
  }
  if (!isDate(last_updated)) throw invalid(`${quotePath}.last_updated is not a valid date`);

  return {
    id: coin.id,
    symbol: coin.symbol,
    price,
    lastUpdated: new Date(last_updated),
  };
}

export function getPriceValidator(body: unknown, ids: number[], currency: string): CmcPrices {
  const data = getDataArray(body);
  const requested = new Set(ids);
  const quotes: CmcQuote[] = [];

  data.forEach((item, i) => {
    const quote = parseQuote(item, `data[${i}]`, currency);
    if (quote && requested.has(quote.id)) quotes.push(quote);
  });

  const received = new Set(quotes.map((q) => q.id));
  const missing = ids.filter((id) => !received.has(id));

  return { quotes, missing };
}
