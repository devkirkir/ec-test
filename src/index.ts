import config from "#config";
import * as db from "#db";

import logger from "#lib/logger/index.js";
import graceful from "#lib/graceful/index.js";
import buildApp from "./app.js";

import type { ProcessEventMap } from "node:process";

const { onShutdown, shutdown } = graceful({ logger, config });

let isStoping = false;

async function closeProcess(signal: keyof ProcessEventMap) {
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
  db.init();
  onShutdown("db", db.close);

  const app = await buildApp();

  const server = app.listen(config.app.port);
  onShutdown("server", () => {
    return new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeIdleConnections();
    });
  });

  // const q = await coinMarketCap({ logger, config }).checkSymbol("TRX");
  // const q = await coinMarketCap({ logger, config }).getPrice([1]);
  // console.log(q);

  logger.info("App has been started");
}

main().catch(async (err) => {
  logger.error(`Failed start in main`, err);

  await shutdown();
  process.exit(1);
});
