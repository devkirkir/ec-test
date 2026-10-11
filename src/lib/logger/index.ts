import config from "#config";
import { formatter } from "./formatter.js";
import { LogLevel, type LogLevelName } from "./logLevels.js";

export type Logger = ReturnType<typeof logger>;
function logger(level: LogLevelName) {
  const error = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.ERROR) {
      console.error(formatter("ERROR", message, ...args));
    }
  };

  const warn = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.WARN) {
      console.warn(formatter("WARN", message, ...args));
    }
  };

  const info = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.INFO) {
      console.info(formatter("INFO", message, ...args));
    }
  };

  const debug = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.DEBUG) {
      console.debug(formatter("DEBUG", message, ...args));
    }
  };

  const trace = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.TRACE) {
      console.trace(formatter("TRACE", message, ...args));
    }
  };

  return { error, warn, info, debug, trace };
}

export default logger(config.app.logLevel);
