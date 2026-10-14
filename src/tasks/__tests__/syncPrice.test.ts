import { afterAll, afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import SQLite, { type Database } from "better-sqlite3";

import loggerFactory from "#lib/logger/factory.js";
import CoinMarketCapError from "#integrations/coinmarketcap/errors/error.js";
import cryptocurrenciesRepository, { type CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import priceHistoryRepository, { type PriceHistoryRepository } from "#repositories/priceHistory/index.js";

import { applySchema } from "../../db/schema.js";
import syncPrice from "../syncPrice.js";

import type { CoinMarketCap } from "#integrations/coinmarketcap/index.js";
import type { CmcPrices, CmcQuote } from "#integrations/coinmarketcap/types.js";

const BTC = { cmcId: 1, symbol: "BTC", name: "Bitcoin" };
const ETH = { cmcId: 1027, symbol: "ETH", name: "Ethereum" };

const NOW = new Date("2026-10-14T12:00:00.000Z");
const CMC_UPDATED_AT = new Date("2026-10-14T11:59:00.000Z");

const quote = (id: number, symbol: string, price: number, lastUpdated = CMC_UPDATED_AT): CmcQuote => ({
  id,
  symbol,
  price,
  lastUpdated,
});

const prices = (quotes: CmcQuote[], missing: number[] = []): CmcPrices => ({ quotes, missing, invalid: [] });

describe("[TASKS] syncPrice", () => {
  const logger = loggerFactory("ERROR");
  let infoSpy: ReturnType<typeof jest.spyOn>;

  let db: Database;
  let cryptocurrencies: CryptocurrenciesRepository;
  let priceHistory: PriceHistoryRepository;
  let getPrice: jest.Mock<CoinMarketCap["getPrice"]>;
  let task: (signal: AbortSignal) => Promise<void>;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

    db = new SQLite(":memory:");
    db.pragma("foreign_keys = true");
    applySchema(db);

    cryptocurrencies = cryptocurrenciesRepository({ db });
    priceHistory = priceHistoryRepository({ db });

    getPrice = jest.fn<CoinMarketCap["getPrice"]>();
    const cmc: CoinMarketCap = { getPrice, checkSymbol: jest.fn<CoinMarketCap["checkSymbol"]>() };

    task = syncPrice({ logger, cmc, cryptocurrencies, priceHistory });
  });

  afterEach(() => {
    db.close();
    jest.useRealTimers();
  });

  afterAll(() => {
    db = cryptocurrencies = priceHistory = task = undefined!;
    global.gc?.();
  });

  const history = (cmcId: number) => {
    const coin = cryptocurrencies.findAll().find((c) => c.cmcId === cmcId);

    return coin ? priceHistory.findByCryptocurrency(coin.id, { limit: 100, offset: 0, order: "asc" }) : null;
  };

  const lastSyncedAt = (symbol: string) => cryptocurrencies.findBySymbol(symbol)?.lastSyncedAt;

  test("does not call CoinMarketCap when nothing is tracked", async () => {
    await task(new AbortController().signal);

    expect(getPrice).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  test("requests prices for all tracked coins with the given signal", async () => {
    cryptocurrencies.create(BTC);
    cryptocurrencies.create(ETH);
    getPrice.mockResolvedValue(prices([]));

    const { signal } = new AbortController();
    await task(signal);

    expect(getPrice).toHaveBeenCalledWith([BTC.cmcId, ETH.cmcId], signal);
  });

  test("skips coins with disabled sync", async () => {
    cryptocurrencies.create(BTC);
    cryptocurrencies.create(ETH);
    cryptocurrencies.update("ETH", { syncEnabled: false });
    getPrice.mockResolvedValue(prices([quote(BTC.cmcId, "BTC", 62000)]));

    await task(new AbortController().signal);

    expect(getPrice).toHaveBeenCalledWith([BTC.cmcId], expect.any(AbortSignal));
    expect(lastSyncedAt("ETH")).toBeNull();
  });

  test("does not call CoinMarketCap when all coins have disabled sync", async () => {
    cryptocurrencies.create(BTC);
    cryptocurrencies.update("BTC", { syncEnabled: false });

    await task(new AbortController().signal);

    expect(getPrice).not.toHaveBeenCalled();
  });

  test("saves prices and updates last synced time", async () => {
    cryptocurrencies.create(BTC);
    cryptocurrencies.create(ETH);
    getPrice.mockResolvedValue(prices([quote(BTC.cmcId, "BTC", 62000.5), quote(ETH.cmcId, "ETH", 2500)]));

    await task(new AbortController().signal);

    expect(history(BTC.cmcId)).toEqual({
      items: [{ price: 62000.5, fetchedAt: NOW.toISOString(), cmcUpdatedAt: CMC_UPDATED_AT.toISOString() }],
      total: 1,
    });
    expect(history(ETH.cmcId)?.items.map((item) => item.price)).toEqual([2500]);

    expect(lastSyncedAt("BTC")).toBe(NOW.toISOString());
    expect(lastSyncedAt("ETH")).toBe(NOW.toISOString());

    expect(infoSpy).toHaveBeenCalledWith("Job syncPrice: saved 2 of 2 prices");
  });

  test("saves available prices and skips missing ones", async () => {
    cryptocurrencies.create(BTC);
    cryptocurrencies.create(ETH);
    getPrice.mockResolvedValue(prices([quote(BTC.cmcId, "BTC", 62000)], [ETH.cmcId]));

    await task(new AbortController().signal);

    expect(history(BTC.cmcId)?.total).toBe(1);
    expect(history(ETH.cmcId)?.total).toBe(0);

    expect(lastSyncedAt("BTC")).toBe(NOW.toISOString());
    expect(lastSyncedAt("ETH")).toBeNull();

    expect(infoSpy).toHaveBeenCalledWith("Job syncPrice: saved 1 of 2 prices");
  });

  test("does not duplicate price that CoinMarketCap has not updated yet", async () => {
    cryptocurrencies.create(BTC);
    getPrice.mockResolvedValue(prices([quote(BTC.cmcId, "BTC", 62000)]));

    await task(new AbortController().signal);

    jest.setSystemTime(new Date(NOW.getTime() + 60_000));
    await task(new AbortController().signal);

    expect(history(BTC.cmcId)?.total).toBe(1);
    expect(lastSyncedAt("BTC")).toBe(new Date(NOW.getTime() + 60_000).toISOString());
    expect(infoSpy).toHaveBeenLastCalledWith("Job syncPrice: saved 0 of 1 prices");
  });

  test("appends new price when CoinMarketCap has updated it", async () => {
    cryptocurrencies.create(BTC);
    getPrice
      .mockResolvedValueOnce(prices([quote(BTC.cmcId, "BTC", 62000)]))
      .mockResolvedValueOnce(prices([quote(BTC.cmcId, "BTC", 62100, new Date(CMC_UPDATED_AT.getTime() + 60_000))]));

    await task(new AbortController().signal);
    await task(new AbortController().signal);

    expect(history(BTC.cmcId)?.items.map((item) => item.price)).toEqual([62000, 62100]);
  });

  test.each([
    ["timeout", new CoinMarketCapError("timeout", "CoinMarketCap: Request timed out")],
    ["rate limit", new CoinMarketCapError("rate_limit", "CoinMarketCap: Rate limit exceeded", 429)],
    ["server error", new CoinMarketCapError("server_error", "CoinMarketCap: Server error", 500)],
    ["invalid response", new CoinMarketCapError("invalid_response", "CoinMarketCap: Invalid response")],
    ["cancel", new CoinMarketCapError("canceled", "CoinMarketCap: Request was canceled")],
  ])("rethrows CoinMarketCap %s and saves nothing", async (_, error) => {
    cryptocurrencies.create(BTC);
    getPrice.mockRejectedValue(error);

    await expect(task(new AbortController().signal)).rejects.toBe(error);

    expect(history(BTC.cmcId)?.total).toBe(0);
    expect(lastSyncedAt("BTC")).toBeNull();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  test("ignores quote for coin removed while request was in flight", async () => {
    cryptocurrencies.create(BTC);
    cryptocurrencies.create(ETH);
    getPrice.mockImplementation(async () => {
      cryptocurrencies.remove("ETH");

      return prices([quote(BTC.cmcId, "BTC", 62000), quote(ETH.cmcId, "ETH", 2500)]);
    });

    await task(new AbortController().signal);

    expect(history(BTC.cmcId)?.total).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS total FROM price_history").get()).toEqual({ total: 1 });
    expect(infoSpy).toHaveBeenCalledWith("Job syncPrice: saved 1 of 2 prices");
  });
});
