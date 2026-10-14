import type { CoinMarketCap } from "#integrations/coinmarketcap/index.js";
import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { PriceHistoryRepository } from "#repositories/priceHistory/index.js";

interface Deps extends BaseDeps {
  cmc: CoinMarketCap;
  cryptocurrencies: CryptocurrenciesRepository;
  priceHistory: PriceHistoryRepository;
}

const syncPrice = (deps: Deps) => async (signal: AbortSignal) => {
  const ids = deps.cryptocurrencies
    .findAll()
    .filter((cryptocurrency) => cryptocurrency.syncEnabled)
    .map((cryptocurrency) => cryptocurrency.cmcId);

  if (ids.length === 0) return;

  const { quotes } = await deps.cmc.getPrice(ids, signal);

  const saved = deps.priceHistory.save(
    quotes.map((quote) => ({ cmcId: quote.id, price: quote.price, cmcUpdatedAt: quote.lastUpdated })),
    new Date(),
  );

  deps.logger.info(`Job syncPrice: saved ${saved} of ${ids.length} prices`);
};

export default syncPrice;
