import type { AxiosInstance } from "axios";
import type { CoinMarketCapConfig } from "./client.js";
import type { CmcCoin, CmcPrices } from "./types.js";
import { checkSymbolValidator, getPriceValidator } from "./validators.js";

interface Deps extends BaseDeps {
  config: CoinMarketCapConfig;
  client: AxiosInstance;
}

export type CoinMarketCap = ReturnType<typeof coinMarketCap>;
function coinMarketCap(deps: Deps) {
  const { client } = deps;
  const { convertCurrency } = deps.config;

  const getPrice = async (ids: number[], signal?: AbortSignal): Promise<CmcPrices> => {
    if (ids.length === 0) return { quotes: [], missing: [], invalid: [] };

    const result = await client.get<unknown>("/v3/cryptocurrency/quotes/latest", {
      params: {
        convert: convertCurrency,
        skip_invalid: true,
        id: ids.join(","),
      },
      headers: {
        Accept: "application/json",
      },
      ...(signal ? { signal } : {}),
    });

    const prices = getPriceValidator(result.data, ids, convertCurrency);
    for (const reason of prices.invalid) deps.logger.warn(`${reason}, skipped`);

    if (prices.missing.length > 0) {
      deps.logger.warn(`CoinMarketCap: No price for ids ${prices.missing.join(", ")}`);
    }

    return prices;
  };

  const checkSymbol = async (symbol: string, signal?: AbortSignal): Promise<CmcCoin[]> => {
    const result = await client.get<unknown>("/v1/cryptocurrency/map", {
      params: {
        symbol,
      },
      headers: {
        Accept: "application/json",
      },
      ...(signal ? { signal } : {}),
    });

    return checkSymbolValidator(result.data, symbol);
  };

  return { checkSymbol, getPrice };
}

export default coinMarketCap;
