import { describe, expect, test } from "@jest/globals";
import CoinMarketCapError from "../errors/error.js";
import { checkSymbolValidator, getPriceValidator } from "../validators.js";

const mapCoin = (overrides: Record<string, unknown> = {}) => ({
  id: 1958,
  name: "TRON",
  symbol: "TRX",
  slug: "tron",
  rank: 8,
  is_active: 1,
  platform: null,
  ...overrides,
});

const quoteCoin = (overrides: Record<string, unknown> = {}, quote: unknown = {}) => ({
  id: 1,
  name: "Bitcoin",
  symbol: "BTC",
  cmc_rank: 1,
  is_active: 1,
  quote: [{ id: 2781, symbol: "USD", price: 82738.85, last_updated: "2026-10-12T12:38:03.000Z", ...(quote as object) }],
  ...overrides,
});

const expectInvalid = (fn: () => unknown, reason: string) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(CoinMarketCapError);
    expect((err as CoinMarketCapError).errorType).toBe("invalid_response");
    expect((err as CoinMarketCapError).message).toContain(reason);
    return;
  }

  throw new Error("Expected validator to throw");
};

describe("[CMC] checkSymbolValidator", () => {
  test("maps valid response to coins", () => {
    expect(checkSymbolValidator({ data: [mapCoin()] }, "trx")).toEqual([
      { id: 1958, symbol: "TRX", name: "TRON", rank: 8, isActive: true },
    ]);
  });

  test("accepts null rank and inactive coin", () => {
    const [coin] = checkSymbolValidator({ data: [mapCoin({ rank: null, is_active: 0 })] }, "TRX");

    expect(coin).toMatchObject({ rank: null, isActive: false });
  });

  test.each([
    ["null body", null, "body is not an object"],
    ["string body", "oops", "body is not an object"],
    ["data not array", { data: {} }, "data is not an array"],
    ["empty data", { data: [] }, "data is empty"],
    ["item not object", { data: [null] }, "data[0] is not an object"],
    ["missing id", { data: [mapCoin({ id: undefined })] }, "data[0].id"],
    ["string id", { data: [mapCoin({ id: "1958" })] }, "data[0].id"],
    ["empty name", { data: [mapCoin({ name: "" })] }, "data[0].name"],
    ["boolean is_active", { data: [mapCoin({ is_active: true })] }, "data[0].is_active"],
    ["negative rank", { data: [mapCoin({ rank: -1 })] }, "data[0].rank"],
    ["other symbol", { data: [mapCoin({ symbol: "ETH" })] }, "does not match"],
  ])("throws on %s", (_, body, reason) => {
    expectInvalid(() => checkSymbolValidator(body, "TRX"), reason);
  });
});

describe("[CMC] getPriceValidator", () => {
  test("maps valid response to quotes", () => {
    expect(getPriceValidator({ data: [quoteCoin()] }, [1], "USD")).toEqual({
      quotes: [{ id: 1, symbol: "BTC", price: 82738.85, lastUpdated: new Date("2026-10-12T12:38:03.000Z") }],
      missing: [],
    });
  });

  test("marks coin with null price as missing", () => {
    const body = { data: [quoteCoin({ id: 30938, cmc_rank: null, is_active: 0 }, { price: null })] };

    expect(getPriceValidator(body, [30938], "USD")).toEqual({ quotes: [], missing: [30938] });
  });

  test("marks not returned ids as missing and ignores not requested", () => {
    const body = { data: [quoteCoin(), quoteCoin({ id: 2, symbol: "ETH", name: "Ethereum" })] };
    const result = getPriceValidator(body, [1, 999], "USD");

    expect(result.quotes.map((q) => q.id)).toEqual([1]);
    expect(result.missing).toEqual([999]);
  });

  test.each([
    ["null body", null, "body is not an object"],
    ["data not array", { data: "x" }, "data is not an array"],
    ["quote not array", { data: [quoteCoin({ quote: {} })] }, "data[0].quote is not an array"],
    ["no currency in quote", { data: [quoteCoin({}, { symbol: "EUR" })] }, "has no USD entry"],
    ["string price", { data: [quoteCoin({}, { price: "100" })] }, "data[0].quote[0].price"],
    ["NaN price", { data: [quoteCoin({}, { price: Number.NaN })] }, "data[0].quote[0].price"],
    ["zero price", { data: [quoteCoin({}, { price: 0 })] }, "data[0].quote[0].price"],
    ["invalid date", { data: [quoteCoin({}, { last_updated: "yesterday" })] }, "last_updated is not a valid date"],
    ["missing date", { data: [quoteCoin({}, { last_updated: undefined })] }, "last_updated is not a valid date"],
  ])("throws on %s", (_, body, reason) => {
    expectInvalid(() => getPriceValidator(body, [1], "USD"), reason);
  });
});
