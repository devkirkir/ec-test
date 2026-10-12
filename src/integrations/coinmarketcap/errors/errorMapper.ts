import axios from "axios";
import { isObject, isString } from "#lib/validators/index.js";
import CoinMarketCapError from "./error.js";

export function errorMapper(err: unknown): CoinMarketCapError {
  if (axios.isCancel(err)) return new CoinMarketCapError("canceled", "CoinMarketCap: Request was canceled");
  if (!axios.isAxiosError<unknown>(err)) return new CoinMarketCapError("global", "Unexpected error");

  if (!err.response) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return new CoinMarketCapError("timeout", "CoinMarketCap: Request timed out");
    }

    return new CoinMarketCapError("server_error", "CoinMarketCap: Unreachable");
  }

  const { status, data } = err.response;

  switch (status) {
    case 400:
      return new CoinMarketCapError("bad_request", "CoinMarketCap: Bad request", status);
    case 401:
      return new CoinMarketCapError("auth", "CoinMarketCap: Unauthorized", status);
    case 403:
      return new CoinMarketCapError("auth", "CoinMarketCap: Forbidden", status);
    case 429:
      return new CoinMarketCapError("rate_limit", "CoinMarketCap: Rate limit exceeded", status);
  }

  return new CoinMarketCapError(
    "server_error",
    `CoinMarketCap: Server error ${getErrorMessage(data) ?? "Unexpected Error"}`,
    status,
  );
}

function getErrorMessage(data: unknown): string | undefined {
  if (!isObject(data) || !isObject(data.status)) return undefined;

  const message = data.status.error_message;

  return isString(message) ? message : undefined;
}
