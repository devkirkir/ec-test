import express from "express";
import type { Config } from "#config";
import type coinMarketCap from "#integrations/coinmarketcap/index.js";
import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import auth from "./middlewares/auth.js";
import errorHandler from "./middlewares/errorHandler.js";
import cryptocurrenciesRouter from "./routes/cryptocurrencies/cryptocurrencies.js";

interface Deps extends BaseDeps {
  config: Config;
  cmc: ReturnType<typeof coinMarketCap>;
  cryptocurrencies: CryptocurrenciesRepository;
}

async function buildApp(deps: Deps) {
  const app = express();

  app.use(express.json());
  app.use(auth(deps.config.apiKey));

  app.use("/cryptocurrencies", cryptocurrenciesRouter(deps));

  app.use(errorHandler(deps.logger));

  return app;
}

export default buildApp;
