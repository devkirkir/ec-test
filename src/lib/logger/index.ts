import config from "#config";
import { LogLevel, type LogLevelName } from "./logLevels.js";

function logger(level: LogLevelName) {
  const error = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.ERROR) {
      console.error(logFormatter("ERROR", message, ...args));
    }
  };

  const warn = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.WARN) {
      console.warn(logFormatter("WARN", message, ...args));
    }
  };

  const info = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.INFO) {
      console.info(logFormatter("INFO", message, ...args));
    }
  };

  const debug = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.DEBUG) {
      console.debug(logFormatter("DEBUG", message, ...args));
    }
  };

  const trace = (message: string, ...args: unknown[]) => {
    if (LogLevel[level] >= LogLevel.TRACE) {
      console.trace(logFormatter("TRACE", message, ...args));
    }
  };

  return { error, warn, info, debug, trace };
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "medium",
});

function logFormatter(prefix: LogLevelName, ...args: unknown[]) {
  const date = dateFormatter.format(new Date());

  return `[${date}] ${prefix}: ${args}`;
}

export default logger(config.app.logLevel);
