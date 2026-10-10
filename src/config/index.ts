import type { LogLevelName } from "#lib/logger/logLevels.js";
import { parseEnvLogLevel } from "./utils/parseEnvLogLevel.js";
import { parseEnvMode, type EnvMode } from "./utils/parseEnvMode.js";
import { parseEnvPort } from "./utils/parseEnvPort.js";

interface Config {
  mode: EnvMode;
  app: {
    port: number;
    logLevel: LogLevelName;
  };
}

const config: Config = {
  mode: parseEnvMode("NODE_ENV"),
  app: {
    port: parseEnvPort("APP_PORT"),
    logLevel: parseEnvLogLevel("APP_LOG_LEVEL"),
  },
};

export default config;
