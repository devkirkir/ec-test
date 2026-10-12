import { formatter } from "./formatter.js";
import { LogLevel, type LogLevelName } from "./logLevels.js";

export type Logger = ReturnType<typeof loggerFactory>;
function loggerFactory(level: LogLevelName) {
  const error = (message: string, error?: unknown) => {
    if (LogLevel[level] >= LogLevel.ERROR) {
      console.error(formatter("ERROR", message));

      if (error instanceof Error) {
        console.error(error.stack);

        return;
      }
    }
  };

  const warn = (message: string) => {
    if (LogLevel[level] >= LogLevel.WARN) {
      console.warn(formatter("WARN", message));
    }
  };

  const info = (message: string) => {
    if (LogLevel[level] >= LogLevel.INFO) {
      console.info(formatter("INFO", message));
    }
  };

  const debug = (message: string) => {
    if (LogLevel[level] >= LogLevel.DEBUG) {
      console.debug(formatter("DEBUG", message));
    }
  };

  const trace = (message: string) => {
    if (LogLevel[level] >= LogLevel.TRACE) {
      console.debug(formatter("TRACE", message));
    }
  };

  return { error, warn, info, debug, trace };
}

export default loggerFactory;
