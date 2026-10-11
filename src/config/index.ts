import type { LogLevelName } from "#lib/logger/logLevels.js";
import { parseEnvInteger } from "./utils/parseEnvInteger.js";
import { parseEnvLogLevel } from "./utils/parseEnvLogLevel.js";
import { parseEnvMode, type EnvMode } from "./utils/parseEnvMode.js";
import { parseEnvPort } from "./utils/parseEnvPort.js";

export interface Config {
  mode: EnvMode;
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
  app: {
    port: parseEnvPort("APP_PORT"),
    logLevel: parseEnvLogLevel("APP_LOG_LEVEL"),
  },
  graceful: {
    timeoutMs: parseEnvInteger("GRACEFUL_TIMEOUT_SHUTDOWN_MS", 3000),
  },
};

export default config;
