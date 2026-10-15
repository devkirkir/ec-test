import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";

import CoinMarketCapError from "#integrations/coinmarketcap/errors/error.js";

import { coin, createTestApp, quote, type TestApp } from "../../../__tests__/testApp.js";

const BTC = { cmcId: 1, symbol: "BTC", name: "Bitcoin" };
const ETH = { cmcId: 1027, symbol: "ETH", name: "Ethereum" };

const CMC_UPDATED_AT = new Date("2026-10-14T11:59:00.000Z");

describe("[ROUTES] /cryptocurrencies", () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(() => {
    ctx.db.close();
  });

  const seedHistory = (cmcId: number, entries: [price: number, fetchedAt: string][]) => {
    for (const [price, fetchedAt] of entries) {
      ctx.priceHistory.save([{ cmcId, price, cmcUpdatedAt: new Date(fetchedAt) }], new Date(fetchedAt));
    }
  };

  describe("GET /", () => {
    test("returns an empty list when nothing is tracked", async () => {
      const res = await ctx.api.get("/cryptocurrencies");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("returns tracked cryptocurrencies with the latest price", async () => {
      ctx.cryptocurrencies.create(BTC);
      ctx.cryptocurrencies.create(ETH);
      seedHistory(BTC.cmcId, [
        [61000, "2026-10-14T10:00:00.000Z"],
        [62000, "2026-10-14T11:00:00.000Z"],
      ]);

      const res = await ctx.api.get("/cryptocurrencies");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        expect.objectContaining({
          symbol: "BTC",
          name: "Bitcoin",
          syncEnabled: true,
          lastSyncedAt: "2026-10-14T11:00:00.000Z",
          latestPrice: {
            price: 62000,
            fetchedAt: "2026-10-14T11:00:00.000Z",
            cmcUpdatedAt: "2026-10-14T11:00:00.000Z",
          },
        }),
        expect.objectContaining({ symbol: "ETH", lastSyncedAt: null, latestPrice: null }),
      ]);
    });

    test("rejects unknown query params", async () => {
      const res = await ctx.api.get("/cryptocurrencies?symbol=BTC");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Unknown query params: symbol" });
    });
  });

  describe("GET /:symbol", () => {
    test("returns a tracked cryptocurrency, symbol is case-insensitive", async () => {
      ctx.cryptocurrencies.create(BTC);

      const res = await ctx.api.get("/cryptocurrencies/btc");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: expect.any(Number),
        cmcId: 1,
        symbol: "BTC",
        name: "Bitcoin",
        syncEnabled: true,
        lastSyncedAt: null,
        latestPrice: null,
      });
    });

    test("returns 404 for an untracked cryptocurrency", async () => {
      const res = await ctx.api.get("/cryptocurrencies/BTC");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Cryptocurrency BTC not found" });
    });

    test("returns 400 for an invalid symbol", async () => {
      const res = await ctx.api.get("/cryptocurrencies/BTC-USD");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "symbol must be 1-10 latin letters or digits" });
    });

    test("rejects unknown query params", async () => {
      ctx.cryptocurrencies.create(BTC);

      const res = await ctx.api.get("/cryptocurrencies/BTC?verbose=true");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /", () => {
    test("starts tracking the active coin with the best rank", async () => {
      ctx.cmc.checkSymbol.mockResolvedValue([
        coin(999, "BTC", "Inactive Bitcoin", 1, false),
        coin(5000, "BTC", "Bitcoin Fork", 900),
        coin(1, "BTC", "Bitcoin", 1),
      ]);

      const res = await ctx.api.post("/cryptocurrencies").send({ symbol: " btc " });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({ cmcId: 1, symbol: "BTC", name: "Bitcoin", syncEnabled: true }),
      );
      expect(ctx.cmc.checkSymbol).toHaveBeenCalledWith("BTC");
      expect(ctx.cryptocurrencies.findBySymbol("BTC")).toEqual(res.body);
    });

    test.each([
      ["a non-object body", ["BTC"], "Body must be an object"],
      ["a missing symbol", {}, "symbol must be a string"],
      ["a non-string symbol", { symbol: 1 }, "symbol must be a string"],
      ["an invalid symbol", { symbol: "BTC/USD" }, "symbol must be 1-10 latin letters or digits"],
      ["unknown fields", { symbol: "BTC", name: "Bitcoin" }, "Unknown fields: name"],
    ])("returns 400 for %s", async (_, body, error) => {
      const res = await ctx.api.post("/cryptocurrencies").send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      expect(ctx.cmc.checkSymbol).not.toHaveBeenCalled();
    });

    test("returns 400 without a body", async () => {
      const res = await ctx.api.post("/cryptocurrencies");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Body must be an object" });
    });

    test("returns 409 when the symbol is already tracked, without calling CoinMarketCap", async () => {
      ctx.cryptocurrencies.create(BTC);

      const res = await ctx.api.post("/cryptocurrencies").send({ symbol: "BTC" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "Cryptocurrency BTC is already tracked" });
      expect(ctx.cmc.checkSymbol).not.toHaveBeenCalled();
    });

    test("returns 409 when the resolved coin is already tracked under another symbol", async () => {
      ctx.cryptocurrencies.create(BTC);
      ctx.cmc.checkSymbol.mockResolvedValue([coin(BTC.cmcId, "XBT", "Bitcoin")]);

      const res = await ctx.api.post("/cryptocurrencies").send({ symbol: "XBT" });

      expect(res.status).toBe(409);
    });

    test("returns 404 when CoinMarketCap does not know the symbol", async () => {
      ctx.cmc.checkSymbol.mockRejectedValue(new CoinMarketCapError("bad_request", "CoinMarketCap: Bad request", 400));

      const res = await ctx.api.post("/cryptocurrencies").send({ symbol: "NOPE" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Cryptocurrency NOPE not found" });
    });

    test("returns 404 when the symbol has no active coins", async () => {
      ctx.cmc.checkSymbol.mockResolvedValue([coin(999, "OLD", "Old Coin", null, false)]);

      const res = await ctx.api.post("/cryptocurrencies").send({ symbol: "OLD" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Cryptocurrency OLD has no active coins" });
      expect(ctx.cryptocurrencies.findAll()).toEqual([]);
    });

    test.each([
      ["timeout", 504],
      ["rate_limit", 503],
      ["server_error", 502],
      ["auth", 502],
    ] as const)("maps CoinMarketCap %s error to %i", async (errorType, status) => {
      ctx.cmc.checkSymbol.mockRejectedValue(new CoinMarketCapError(errorType, "CoinMarketCap: failed"));

      const res = await ctx.api.post("/cryptocurrencies").send({ symbol: "BTC" });

      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error: "CoinMarketCap is unavailable" });
      expect(ctx.cryptocurrencies.findAll()).toEqual([]);
    });
  });

  describe("PATCH /:symbol", () => {
    test("toggles syncEnabled", async () => {
      ctx.cryptocurrencies.create(BTC);

      const off = await ctx.api.patch("/cryptocurrencies/btc").send({ syncEnabled: false });

      expect(off.status).toBe(200);
      expect(off.body).toEqual(expect.objectContaining({ symbol: "BTC", syncEnabled: false }));
      expect(ctx.cryptocurrencies.findBySymbol("BTC")?.syncEnabled).toBe(false);

      const on = await ctx.api.patch("/cryptocurrencies/BTC").send({ syncEnabled: true });

      expect(on.body.syncEnabled).toBe(true);
    });

    test("returns 404 for an untracked cryptocurrency", async () => {
      const res = await ctx.api.patch("/cryptocurrencies/BTC").send({ syncEnabled: false });

      expect(res.status).toBe(404);
    });

    test.each([
      ["a non-boolean value", { syncEnabled: "false" }, "syncEnabled must be a boolean"],
      ["an empty body", {}, "syncEnabled must be a boolean"],
      ["unknown fields", { syncEnabled: false, name: "X" }, "Unknown fields: name"],
      ["a non-object body", [false], "Body must be an object"],
    ])("returns 400 for %s", async (_, body, error) => {
      ctx.cryptocurrencies.create(BTC);

      const res = await ctx.api.patch("/cryptocurrencies/BTC").send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      expect(ctx.cryptocurrencies.findBySymbol("BTC")?.syncEnabled).toBe(true);
    });
  });

  describe("DELETE /:symbol", () => {
    test("stops tracking and removes the price history", async () => {
      ctx.cryptocurrencies.create(BTC);
      seedHistory(BTC.cmcId, [[62000, "2026-10-14T11:00:00.000Z"]]);

      const res = await ctx.api.delete("/cryptocurrencies/btc");

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(ctx.cryptocurrencies.findBySymbol("BTC")).toBeNull();
      expect(ctx.db.prepare("SELECT COUNT(*) AS count FROM price_history").get()).toEqual({ count: 0 });
    });

    test("returns 404 for an untracked cryptocurrency", async () => {
      const res = await ctx.api.delete("/cryptocurrencies/BTC");

      expect(res.status).toBe(404);
    });

    test("returns 400 for an invalid symbol", async () => {
      const res = await ctx.api.delete("/cryptocurrencies/VERYLONGSYMBOL");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /:symbol/price", () => {
    test("returns the latest synced price when sync is enabled", async () => {
      ctx.cryptocurrencies.create(BTC);
      seedHistory(BTC.cmcId, [
        [61000, "2026-10-14T10:00:00.000Z"],
        [62000, "2026-10-14T11:00:00.000Z"],
      ]);

      const res = await ctx.api.get("/cryptocurrencies/btc/price");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        symbol: "BTC",
        currency: "USD",
        source: "history",
        price: 62000,
        fetchedAt: "2026-10-14T11:00:00.000Z",
        cmcUpdatedAt: "2026-10-14T11:00:00.000Z",
      });
      expect(ctx.cmc.getPrice).not.toHaveBeenCalled();
    });

    test("fetches the live price when nothing has been synced yet", async () => {
      ctx.cryptocurrencies.create(BTC);
      ctx.cmc.getPrice.mockResolvedValue({
        quotes: [quote(BTC.cmcId, "BTC", 62500, CMC_UPDATED_AT)],
        missing: [],
        invalid: [],
      });

      const res = await ctx.api.get("/cryptocurrencies/BTC/price");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ source: "coinmarketcap", price: 62500 }));
      expect(ctx.cmc.getPrice).toHaveBeenCalledWith([BTC.cmcId]);
      expect(ctx.cryptocurrencies.findBySymbol("BTC")?.lastSyncedAt).toBeNull();
    });

    test("returns 404 for an untracked cryptocurrency", async () => {
      const res = await ctx.api.get("/cryptocurrencies/BTC/price");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Cryptocurrency BTC not found" });
    });

    test("rejects unknown query params", async () => {
      ctx.cryptocurrencies.create(BTC);

      const res = await ctx.api.get("/cryptocurrencies/BTC/price?currency=EUR");

      expect(res.status).toBe(400);
    });

    describe("with disabled sync", () => {
      beforeEach(() => {
        ctx.cryptocurrencies.create(ETH);
        ctx.cryptocurrencies.update("ETH", { syncEnabled: false });
      });

      test("fetches the live price from CoinMarketCap without saving it", async () => {
        seedHistory(ETH.cmcId, [[2000, "2026-10-01T00:00:00.000Z"]]);
        ctx.cmc.getPrice.mockResolvedValue({
          quotes: [quote(ETH.cmcId, "ETH", 2500.5, CMC_UPDATED_AT)],
          missing: [],
          invalid: [],
        });

        const before = Date.now();
        const res = await ctx.api.get("/cryptocurrencies/ETH/price");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          symbol: "ETH",
          currency: "USD",
          source: "coinmarketcap",
          price: 2500.5,
          fetchedAt: expect.any(String),
          cmcUpdatedAt: CMC_UPDATED_AT.toISOString(),
        });
        expect(Date.parse(res.body.fetchedAt)).toBeGreaterThanOrEqual(before);
        expect(ctx.cmc.getPrice).toHaveBeenCalledWith([ETH.cmcId]);

        const eth = ctx.cryptocurrencies.findBySymbol("ETH");
        expect(eth?.latestPrice?.price).toBe(2000);
        expect(eth?.lastSyncedAt).toBe("2026-10-01T00:00:00.000Z");
      });

      test("returns 502 when CoinMarketCap returns no price", async () => {
        ctx.cmc.getPrice.mockResolvedValue({ quotes: [], missing: [ETH.cmcId], invalid: [] });

        const res = await ctx.api.get("/cryptocurrencies/ETH/price");

        expect(res.status).toBe(502);
        expect(res.body).toEqual({ error: "CoinMarketCap returned no price for ETH" });
      });

      test("returns 504 when CoinMarketCap times out", async () => {
        ctx.cmc.getPrice.mockRejectedValue(new CoinMarketCapError("timeout", "CoinMarketCap: Request timed out"));

        const res = await ctx.api.get("/cryptocurrencies/ETH/price");

        expect(res.status).toBe(504);
        expect(res.body).toEqual({ error: "CoinMarketCap is unavailable" });
      });
    });
  });

  describe("GET /:symbol/history", () => {
    beforeEach(() => {
      ctx.cryptocurrencies.create(BTC);
      seedHistory(BTC.cmcId, [
        [60000, "2026-10-10T00:00:00.000Z"],
        [61000, "2026-10-11T00:00:00.000Z"],
        [62000, "2026-10-12T00:00:00.000Z"],
        [63000, "2026-10-13T00:00:00.000Z"],
      ]);
    });

    const prices = (body: { items: { price: number }[] }) => body.items.map((item) => item.price);

    test("returns the newest prices first by default", async () => {
      const res = await ctx.api.get("/cryptocurrencies/btc/history");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        symbol: "BTC",
        currency: "USD",
        items: expect.any(Array),
        pagination: { limit: 10, offset: 0, total: 4 },
      });
      expect(prices(res.body)).toEqual([63000, 62000, 61000, 60000]);
      expect(res.body.items[0]).toEqual({
        price: 63000,
        fetchedAt: "2026-10-13T00:00:00.000Z",
        cmcUpdatedAt: "2026-10-13T00:00:00.000Z",
      });
    });

    test("applies order, limit and offset", async () => {
      const res = await ctx.api.get("/cryptocurrencies/BTC/history?order=asc&limit=2&offset=1");

      expect(res.status).toBe(200);
      expect(prices(res.body)).toEqual([61000, 62000]);
      expect(res.body.pagination).toEqual({ limit: 2, offset: 1, total: 4 });
    });

    test("filters by an inclusive date range", async () => {
      const res = await ctx.api.get("/cryptocurrencies/BTC/history?from=2026-10-11&to=2026-10-12T00:00:00Z");

      expect(res.status).toBe(200);
      expect(prices(res.body)).toEqual([62000, 61000]);
      expect(res.body.pagination.total).toBe(2);
    });

    test("returns an empty page for a coin without history", async () => {
      ctx.cryptocurrencies.create(ETH);

      const res = await ctx.api.get("/cryptocurrencies/ETH/history");

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    test("returns 404 for an untracked cryptocurrency", async () => {
      const res = await ctx.api.get("/cryptocurrencies/SOL/history");

      expect(res.status).toBe(404);
    });

    test.each([
      ["limit=0", "limit must be an integer between 1 and 100"],
      ["limit=101", "limit must be an integer between 1 and 100"],
      ["limit=1.5", "limit must be an integer between 1 and 100"],
      ["offset=-1", "offset must be an integer between 0 and 9007199254740991"],
      ["limit=1&limit=2", "limit must be a single value"],
      ["order=random", "order must be one of: asc, desc"],
      ["from=yesterday", "from must be an ISO 8601 date"],
      ["from=2026-02-30", "from must be an existing date"],
      ["from=2026-10-12&to=2026-10-11", "from must be less than or equal to to"],
      ["page=2", "Unknown query params: page"],
    ])("returns 400 for ?%s", async (query, error) => {
      const res = await ctx.api.get(`/cryptocurrencies/BTC/history?${query}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
    });
  });
});
