import express from "express";
import swaggerUi from "swagger-ui-express";

import auth from "./middlewares/auth.js";
import errorHandler from "./middlewares/errorHandler.js";
import notFound from "./middlewares/notFound.js";
import cryptocurrenciesRouter from "./routes/cryptocurrencies/cryptocurrencies.js";
import openApiSpec from "./docs/openapi.js";

import type { Config } from "#config";
import type coinMarketCap from "#integrations/coinmarketcap/index.js";
import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { PriceHistoryRepository } from "#repositories/priceHistory/index.js";

interface Deps extends BaseDeps {
  config: Config;
  cmc: ReturnType<typeof coinMarketCap>;
  cryptocurrencies: CryptocurrenciesRepository;
  priceHistory: PriceHistoryRepository;
}

async function buildApp(deps: Deps) {
  const app = express();

  app.use(express.json());

  app.get("/docs/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(auth(deps.config.apiKey));

  app.use(
    "/cryptocurrencies",
    cryptocurrenciesRouter({ ...deps, currency: deps.config.integrations.coinmarketcap.convertCurrency }),
  );

  app.use(notFound);
  app.use(errorHandler(deps.logger));

  return app;
}

export default buildApp;
