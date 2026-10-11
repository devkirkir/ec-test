import type { LogLevelName } from "./logLevels.js";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatter(prefix: LogLevelName, message: string) {
  const date = dateFormatter.format(new Date());

  return `[${date}] ${prefix}: ${message}`;
}
