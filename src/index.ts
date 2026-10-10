import express from "express";
import * as db from "#db";
import config from "#config";
import logger from "#lib/logger/index.js";

async function buildApp() {
  const app = express();

  app.use(express.json());

  return app;
}

async function main() {
  db.init();

  const app = await buildApp();
  const server = app.listen(config.app.port);

  logger.info("App has been started");
}

main().catch((err) => {
  console.error(`Failed start in main: `, err);

  db.close();
  process.exit(1);
});
