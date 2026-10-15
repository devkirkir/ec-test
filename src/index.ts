import config from "#config";
import * as db from "#db";

import buildApp from "./app.js";
import syncPriceTask from "./tasks/syncPrice.js";

import logger from "#lib/logger/index.js";
import graceful from "#lib/graceful/index.js";
import scheduler from "#lib/scheduler/index.js";

import coinMarketCap from "#integrations/coinmarketcap/index.js";
import { createCoinMarketClient } from "#integrations/coinmarketcap/client.js";
import cryptocurrenciesRepository from "#repositories/cryptocurrencies/index.js";
import priceHistoryRepository from "#repositories/priceHistory/index.js";

const { onShutdown, shutdown } = graceful({ logger, config });

let isStoping = false;

async function closeProcess(signal: string) {
  if (isStoping) {
    logger.warn(`Received ${signal} during shutdown. Forced exit...`);
    process.exit(1);
  }

  isStoping = true;
  logger.info(`Received ${signal}. Shutting down...`);

  await shutdown();
  process.exit(0);
}

process.on("SIGTERM", closeProcess);
process.on("SIGINT", closeProcess);

async function main() {
  const database = db.init(config.db.path);
  onShutdown("db", db.close);

  // вообще сделал бы единый билдер включенных интеграций, подключалось бы то, что указано, например, в env
  const cmcConfig = config.integrations.coinmarketcap;
  const cmc = coinMarketCap({ logger, config: cmcConfig, client: createCoinMarketClient(cmcConfig) });
  const cryptocurrencies = cryptocurrenciesRepository({ db: database });
  const priceHistory = priceHistoryRepository({ db: database });

  const app = await buildApp({ logger, config, cmc, cryptocurrencies, priceHistory });

  const server = app.listen(config.app.port);
  onShutdown("server", () => {
    return new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeIdleConnections();
    });
  });

  const syncPrice = scheduler("syncPrice", {
    logger,
    intervalMs: config.app.scheduleInterval * 1000,
    task: syncPriceTask({ logger, cmc, cryptocurrencies, priceHistory }),
  });

  syncPrice.start();
  onShutdown("syncPrice", syncPrice.stop);

  logger.info("App has been started");
}

main().catch(async (err) => {
  logger.error(`Failed start in main`, err);

  await shutdown();
  process.exit(1);
});
