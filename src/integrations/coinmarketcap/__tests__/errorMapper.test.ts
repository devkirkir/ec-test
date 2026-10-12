import { describe, expect, test } from "@jest/globals";
import { AxiosError, AxiosHeaders, CanceledError, type AxiosResponse } from "axios";
import { errorMapper } from "../errors/errorMapper.js";

const config = { headers: new AxiosHeaders() };

const httpError = (status: number, data: unknown = {}) => {
  const response: AxiosResponse = { status, statusText: "", data, headers: {}, config };

  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, null, response);
};

const networkError = (code: string) => new AxiosError("Network failed", code, config, {});

describe("[CMC] errorMapper", () => {
  test.each([
    [400, "bad_request"],
    [401, "auth"],
    [403, "auth"],
    [429, "rate_limit"],
    [500, "server_error"],
    [502, "server_error"],
    [503, "server_error"],
  ])("maps %i to %s", (status, errorType) => {
    const err = errorMapper(httpError(status));

    expect(err.errorType).toBe(errorType);
    expect(err.statusCode).toBe(status);
  });

  test("takes server error message from status.error_message", () => {
    const err = errorMapper(httpError(500, { status: { error_code: 500, error_message: "Internal failure" } }));

    expect(err.message).toBe("CoinMarketCap: Server error Internal failure");
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
    ["html string", "<html>Bad Gateway</html>"],
    ["status without message", { status: { error_code: 500, error_message: null } }],
  ])("falls back to default message when body is %s", (_, data) => {
    const err = errorMapper(httpError(500, data));

    expect(err.errorType).toBe("server_error");
    expect(err.message).toBe("CoinMarketCap: Server error Unexpected Error");
  });

  test.each(["ECONNABORTED", "ETIMEDOUT"])("maps %s to timeout", (code) => {
    const err = errorMapper(networkError(code));

    expect(err.errorType).toBe("timeout");
    expect(err.statusCode).toBeUndefined();
  });

  test("maps request without response to unreachable server_error", () => {
    const err = errorMapper(networkError("ECONNREFUSED"));

    expect(err.errorType).toBe("server_error");
    expect(err.message).toBe("CoinMarketCap: Unreachable");
  });

  test("maps canceled request to canceled", () => {
    expect(errorMapper(new CanceledError()).errorType).toBe("canceled");
  });

  test.each([
    ["Error", new Error("boom")],
    ["string", "boom"],
    ["undefined", undefined],
  ])("maps non-axios %s to global", (_, err) => {
    expect(errorMapper(err).errorType).toBe("global");
  });
});
