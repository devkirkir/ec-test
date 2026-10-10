import { isLogLevelName, type LogLevelName } from "#lib/logger/logLevels.js";
import { checkEnvExisting } from "./checkEnvExisting.js";

export const parseEnvLogLevel = (key: string): LogLevelName => {
  const value = checkEnvExisting(key).toUpperCase();
  if (!isLogLevelName(value)) throw new Error(`${key} is not a valid log level`);

  return value;
};
