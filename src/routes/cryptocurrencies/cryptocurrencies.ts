import { Router } from "express";

import observe from "./routes/observe.post.js";
import unobserve from "./routes/unobserve.delete.js";
import list from "./routes/list.get.js";
import getOne from "./routes/getOne.get.js";
import history from "./routes/history.get.js";
import price from "./routes/price.get.js";

import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { PriceHistoryRepository } from "#repositories/priceHistory/index.js";
import type { CoinMarketCap } from "#integrations/coinmarketcap/index.js";

interface Deps {
  cmc: CoinMarketCap;
  cryptocurrencies: CryptocurrenciesRepository;
  priceHistory: PriceHistoryRepository;
  currency: string;
}

function cryptocurrenciesRouter(deps: Deps) {
  const router = Router();

  router.get("/", list(deps));
  router.get("/:symbol", getOne(deps));
  router.get("/:symbol/history", history(deps));
  router.get("/:symbol/price", price(deps));

  router.post("/", observe(deps));

  router.delete("/:symbol", unobserve(deps));

  return router;
}

export default cryptocurrenciesRouter;
