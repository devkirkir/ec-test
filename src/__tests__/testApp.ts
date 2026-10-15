import { jest } from "@jest/globals";
import SQLite, { type Database } from "better-sqlite3";
import request from "supertest";

import config from "#config";
import loggerFactory from "#lib/logger/factory.js";
import cryptocurrenciesRepository from "#repositories/cryptocurrencies/index.js";
import priceHistoryRepository from "#repositories/priceHistory/index.js";

import buildApp from "../app.js";
import { applySchema } from "../db/schema.js";

import type { Express } from "express";
import type { Logger } from "#lib/logger/factory.js";
import type { CoinMarketCap } from "#integrations/coinmarketcap/index.js";
import type { CmcCoin, CmcQuote } from "#integrations/coinmarketcap/types.js";
import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { PriceHistoryRepository } from "#repositories/priceHistory/index.js";

export const AUTH = `Bearer ${config.apiKey}`;

export const coin = (id: number, symbol: string, name: string, rank: number | null = 1, isActive = true): CmcCoin => ({
  id,
  symbol,
  name,
  rank,
  isActive,
});

export const quote = (id: number, symbol: string, price: number, lastUpdated: Date): CmcQuote => ({
  id,
  symbol,
  price,
  lastUpdated,
});

type Api = Record<"get" | "post" | "patch" | "delete", (url: string) => request.Test>;

export interface TestApp {
  app: Express;
  api: Api;
  db: Database;
  cmc: { [K in keyof CoinMarketCap]: jest.Mock<CoinMarketCap[K]> };
  cryptocurrencies: CryptocurrenciesRepository;
  priceHistory: PriceHistoryRepository;
  errorSpy: jest.Spied<Logger["error"]>;
}

export async function createTestApp(): Promise<TestApp> {
  const logger = loggerFactory("ERROR");
  const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
  jest.spyOn(logger, "warn").mockImplementation(() => {});

  const db: Database = new SQLite(":memory:");
  db.pragma("foreign_keys = true");
  applySchema(db);

  const cryptocurrencies = cryptocurrenciesRepository({ db });
  const priceHistory = priceHistoryRepository({ db });

  const cmc = {
    checkSymbol: jest.fn<CoinMarketCap["checkSymbol"]>(),
    getPrice: jest.fn<CoinMarketCap["getPrice"]>(),
  };

  const app = await buildApp({ logger, config, cmc, cryptocurrencies, priceHistory });

  const api: Api = {
    get: (url: string) => request(app).get(url).set("Authorization", AUTH),
    post: (url: string) => request(app).post(url).set("Authorization", AUTH),
    patch: (url: string) => request(app).patch(url).set("Authorization", AUTH),
    delete: (url: string) => request(app).delete(url).set("Authorization", AUTH),
  };

  return { app, api, db, cmc, cryptocurrencies, priceHistory, errorSpy };
}
