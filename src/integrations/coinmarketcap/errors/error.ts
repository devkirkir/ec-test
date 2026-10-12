import type { CmcErrors } from "../types.js";

class CoinMarketCapError extends Error {
  readonly errorType: CmcErrors;
  readonly statusCode: undefined | number;

  constructor(errorType: CmcErrors, message: string, statusCode?: number) {
    super(message);
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}

export default CoinMarketCapError;
