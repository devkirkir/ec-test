import type { ErrorRequestHandler } from "express";
import HttpError from "#lib/httpError.js";
import type { Logger } from "#lib/logger/factory.js";
import CoinMarketCapError from "#integrations/coinmarketcap/errors/error.js";
import RepositoryError from "#repositories/cryptocurrencies/error.js";

const cmcStatus = (err: CoinMarketCapError) => {
  switch (err.errorType) {
    case "timeout":
      return 504;
    case "rate_limit":
      return 503;
    default:
      return 502;
  }
};

function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    if (err instanceof RepositoryError && err.errorType === "conflict") {
      return res.status(409).json({ error: err.message });
    }

    if (err instanceof CoinMarketCapError) {
      logger.warn(err.message);
      return res.status(cmcStatus(err)).json({ error: "CoinMarketCap is unavailable" });
    }

    if (err instanceof SyntaxError && "type" in err && err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    logger.error("Unhandled request error", err);

    res.status(500).json({ error: "Internal server error" });
  };
}

export default errorHandler;
