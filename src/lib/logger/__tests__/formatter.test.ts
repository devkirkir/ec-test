import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { formatter } from "../formatter.js";

describe("[LOGGER] formatter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("format date, level and message", () => {
    expect(formatter("DEBUG", "qwerty")).toBe("[01.01.2026, 00:00:00] DEBUG: qwerty");
  });

  test("takes date at call time", () => {
    jest.setSystemTime(new Date("2027-01-01T00:00:00Z"));

    expect(formatter("INFO", "qwerty")).toBe("[01.01.2027, 00:00:00] INFO: qwerty");
  });

  test.each(["ERROR", "WARN", "INFO", "DEBUG", "TRACE"] as const)("uses %s prefix", (level) => {
    expect(formatter(level, "qwerty")).toBe(`[01.01.2026, 00:00:00] ${level}: qwerty`);
  });
});
