import HttpError from "#lib/httpError.js";

const SYMBOL_PATTERN = /^[A-Z0-9]{1,10}$/;

function parseSymbol(symbol: unknown): string {
  if (typeof symbol !== "string") throw new HttpError(400, "symbol must be a string");

  const normalized = symbol.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(normalized)) {
    throw new HttpError(400, "symbol must be 1-10 latin letters or digits");
  }

  return normalized;
}

export default parseSymbol;
