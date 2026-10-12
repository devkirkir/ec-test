import type { Config } from "#config";
import { coinMarketClient } from "./client.js";
import type { CmcCoin, CmcPrices } from "./types.js";
import { checkSymbolValidator, getPriceValidator } from "./validators.js";

interface Deps extends BaseDeps {
  config: Config;
}

function coinMarketCap(deps: Deps) {
  const { convertCurrency } = deps.config.integrations.coinmarketcap;

  const getPrice = async (ids: number[], signal?: AbortSignal): Promise<CmcPrices> => {
    if (ids.length === 0) return { quotes: [], missing: [] };

    const result = await coinMarketClient.get<unknown>("/v3/cryptocurrency/quotes/latest", {
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
    if (prices.missing.length > 0) {
      deps.logger.warn(`CoinMarketCap: No price for ids ${prices.missing.join(", ")}`);
    }

    return prices;
  };

  const checkSymbol = async (symbol: string, signal?: AbortSignal): Promise<CmcCoin[]> => {
    const result = await coinMarketClient.get<unknown>("/v1/cryptocurrency/map", {
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
