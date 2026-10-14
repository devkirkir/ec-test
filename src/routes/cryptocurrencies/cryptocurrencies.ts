import { Router } from "express";

import observe from "./routes/observe.post.js";

import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { CoinMarketCap } from "#integrations/coinmarketcap/index.js";

interface Deps {
  cmc: CoinMarketCap;
  cryptocurrencies: CryptocurrenciesRepository;
}

function cryptocurrenciesRouter(deps: Deps) {
  const router = Router();

  router.post("/", observe(deps));

  return router;
}

export default cryptocurrenciesRouter;
