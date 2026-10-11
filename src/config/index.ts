import type { LogLevelName } from "#lib/logger/logLevels.js";
import { parseEnvApiKey } from "./utils/parseEnvApiKey.js";
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
  };
  graceful: {
    timeoutMs: number;
  };
}

const config: Config = {
  mode: parseEnvMode("NODE_ENV"),
  apiKey: parseEnvApiKey("API_KEY"),
  app: {
    port: parseEnvPort("APP_PORT"),
    logLevel: parseEnvLogLevel("APP_LOG_LEVEL"),
  },
  graceful: {
    timeoutMs: parseEnvInteger("GRACEFUL_TIMEOUT_SHUTDOWN_MS", 3000),
  },
};

export default config;
