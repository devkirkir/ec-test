import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import config from "#config";
import loggerFactory from "#lib/logger/factory.js";
import { coinMarketClient } from "../client.js";
import CoinMarketCapError from "../errors/error.js";
import coinMarketCap from "../index.js";

const defaultAdapter = coinMarketClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];

// подменяем транспорт, интерцептор и валидаторы работают по-настоящему
const respond = (status: number, data: unknown): AxiosAdapter => {
  return async (req) => {
    requests.push(req);
    const response = { status, statusText: "", data, headers: {}, config: req };

    if (status >= 200 && status < 300) return response;
    throw new AxiosError("Request failed", "ERR_BAD_RESPONSE", req, {}, response);
  };
};

const fail = (code: string): AxiosAdapter => {
  return async (req) => {
    requests.push(req);
    throw new AxiosError("Network failed", code, req, {});
  };
};

const quoteCoin = (id: number, symbol: string, price: number | null) => ({
  id,
  name: symbol,
  symbol,
  cmc_rank: price === null ? null : id,
  is_active: price === null ? 0 : 1,
  quote: [{ id: 2781, symbol: "USD", price, last_updated: "2026-10-12T12:38:03.000Z" }],
});

const mapCoin = { id: 1958, name: "TRON", symbol: "TRX", slug: "tron", rank: 8, is_active: 1, platform: null };

const expectCmcError = async (promise: Promise<unknown>, errorType: string) => {
  const err = await promise.catch((e: unknown) => e);

  expect(err).toBeInstanceOf(CoinMarketCapError);
  expect((err as CoinMarketCapError).errorType).toBe(errorType);
};

describe("[CMC] integration", () => {
  const logger = loggerFactory("ERROR");
  let warnSpy: ReturnType<typeof jest.spyOn>;
  let cmc: ReturnType<typeof coinMarketCap>;

  beforeEach(() => {
    requests = [];
    warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});
    cmc = coinMarketCap({ logger, config });
  });

  afterEach(() => {
    if (defaultAdapter) coinMarketClient.defaults.adapter = defaultAdapter;
  });

  describe("getPrice", () => {
    test("returns quotes for requested ids", async () => {
      coinMarketClient.defaults.adapter = respond(200, {
        data: [quoteCoin(1, "BTC", 82738.85), quoteCoin(1958, "TRX", 0.33)],
      });

      const result = await cmc.getPrice([1, 1958]);

      expect(result).toEqual({
        quotes: [
          { id: 1, symbol: "BTC", price: 82738.85, lastUpdated: new Date("2026-10-12T12:38:03.000Z") },
          { id: 1958, symbol: "TRX", price: 0.33, lastUpdated: new Date("2026-10-12T12:38:03.000Z") },
        ],
        missing: [],
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    test("sends ids comma-separated with currency and api key", async () => {
      coinMarketClient.defaults.adapter = respond(200, { data: [] });

      await cmc.getPrice([1, 1958]);

      const [req] = requests;
      expect(req?.url).toBe("/v3/cryptocurrency/quotes/latest");
      expect(req?.params).toMatchObject({ id: "1,1958", convert: "USD", skip_invalid: true });
      expect(req?.headers["X-CMC_PRO_API_KEY"]).toBe("test-cmc-key");
      expect(req?.timeout).toBe(1000);
    });

    test("reports ids without price as missing and warns", async () => {
      coinMarketClient.defaults.adapter = respond(200, {
        data: [quoteCoin(1, "BTC", 82738.85), quoteCoin(30938, "BTC", null)],
      });

      const result = await cmc.getPrice([1, 30938, 999]);

      expect(result.quotes.map((q) => q.id)).toEqual([1]);
      expect(result.missing).toEqual([30938, 999]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("30938, 999"));
    });

    test("does not call api for empty ids", async () => {
      coinMarketClient.defaults.adapter = respond(200, { data: [] });

      await expect(cmc.getPrice([])).resolves.toEqual({ quotes: [], missing: [] });
      expect(requests).toHaveLength(0);
    });

    test("throws invalid_response on malformed body", async () => {
      coinMarketClient.defaults.adapter = respond(200, "<html>ok</html>");

      await expectCmcError(cmc.getPrice([1]), "invalid_response");
    });

    test.each([
      [401, "auth"],
      [429, "rate_limit"],
      [500, "server_error"],
    ])("throws on HTTP %i as %s", async (status, errorType) => {
      coinMarketClient.defaults.adapter = respond(status, { status: { error_code: status, error_message: "fail" } });

      await expectCmcError(cmc.getPrice([1]), errorType);
    });

    test("throws timeout when api does not answer in time", async () => {
      coinMarketClient.defaults.adapter = fail("ECONNABORTED");

      await expectCmcError(cmc.getPrice([1]), "timeout");
    });

    test("throws server_error when api is unreachable", async () => {
      coinMarketClient.defaults.adapter = fail("ECONNREFUSED");

      await expectCmcError(cmc.getPrice([1]), "server_error");
    });
  });

  describe("checkSymbol", () => {
    test("returns coins for symbol", async () => {
      coinMarketClient.defaults.adapter = respond(200, { data: [mapCoin] });

      await expect(cmc.checkSymbol("TRX")).resolves.toEqual([
        { id: 1958, symbol: "TRX", name: "TRON", rank: 8, isActive: true },
      ]);
      expect(requests[0]?.url).toBe("/v1/cryptocurrency/map");
      expect(requests[0]?.params).toEqual({ symbol: "TRX" });
    });

    test("throws bad_request for unknown symbol", async () => {
      const body = { status: { error_code: 400, error_message: 'Invalid value for "symbol": "ZZZQQQ"' } };
      coinMarketClient.defaults.adapter = respond(400, body);

      await expectCmcError(cmc.checkSymbol("ZZZQQQ"), "bad_request");
    });

    test("throws invalid_response on empty data", async () => {
      coinMarketClient.defaults.adapter = respond(200, { data: [] });

      await expectCmcError(cmc.checkSymbol("TRX"), "invalid_response");
    });

    test("throws timeout when api does not answer in time", async () => {
      coinMarketClient.defaults.adapter = fail("ETIMEDOUT");

      await expectCmcError(cmc.checkSymbol("TRX"), "timeout");
    });
  });
});
