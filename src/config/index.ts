import type { LogLevelName } from "#lib/logger/logLevels.js";
import { checkEnvExisting } from "./utils/checkEnvExisting.js";
import { parseEnvApiKey } from "./utils/parseEnvApiKey.js";
import { parseEnvConvertCurrency, type EnvCurrency } from "./utils/parseEnvConvertCurrency.js";
import { parseEnvInteger } from "./utils/parseEnvInteger.js";
import { parseEnvLogLevel } from "./utils/parseEnvLogLevel.js";
import { parseEnvMode, type EnvMode } from "./utils/parseEnvMode.js";
import { parseEnvPort } from "./utils/parseEnvPort.js";

export interface Config {
  mode: EnvMode;
  apiKey: string;
  app: {
    port: number;
    logLevel: LogLevelName;
    scheduleInterval: number;
  };
  db: {
    path: string;
  };
  graceful: {
    timeoutMs: number;
  };
  integrations: {
    coinmarketcap: {
      url: string;
      key: string;
      convertCurrency: EnvCurrency;
      timeout: number;
    };
  };
}

const config: Config = {
  mode: parseEnvMode("NODE_ENV"),
  apiKey: parseEnvApiKey("API_KEY"),
  app: {
    port: parseEnvPort("APP_PORT"),
    logLevel: parseEnvLogLevel("APP_LOG_LEVEL"),
    scheduleInterval: parseEnvInteger("APP_SCHEDULE_INTERVAL_SEC"),
  },
  db: {
    path: checkEnvExisting("DB_PATH"),
  },
  graceful: {
    timeoutMs: parseEnvInteger("GRACEFUL_TIMEOUT_SHUTDOWN_MS"),
  },
  integrations: {
    coinmarketcap: {
      url: checkEnvExisting("COIN_MARKET_CAP_BASE_URL"),
      key: checkEnvExisting("COIN_MARKET_CAP_API_KEY"),
      convertCurrency: parseEnvConvertCurrency("COIN_MARKET_CAP_CONVERT_CURRENCY"),
      timeout: parseEnvInteger("COIN_MARKET_CAP_TIMEOUT_MS"),
    },
  },
};

export default config;
