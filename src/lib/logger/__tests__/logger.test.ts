import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { logger as log } from "../index.js";

describe("[LOGGER] logger", () => {
  let errorSpy: ReturnType<typeof jest.spyOn>;
  let warnSpy: ReturnType<typeof jest.spyOn>;
  let infoSpy: ReturnType<typeof jest.spyOn>;
  let debugSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  });

  test("ERROR level writes error", () => {
    log("ERROR").error("qwerty");

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ERROR: qwerty"));
  });

  test("ERROR level ignores warn, info, debug and trace", () => {
    const logger = log("ERROR");

    logger.warn("qwerty");
    logger.info("qwerty");
    logger.debug("qwerty");
    logger.trace("qwerty");

    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  test("WARN level writes warn", () => {
    log("WARN").warn("qwerty");

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("WARN: qwerty"));
  });

  test("WARN level ignores info", () => {
    log("WARN").info("qwerty");

    expect(infoSpy).not.toHaveBeenCalled();
  });

  test("INFO level writes info", () => {
    log("INFO").info("qwerty");

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("INFO: qwerty"));
  });

  test("INFO level ignores debug", () => {
    log("INFO").debug("qwerty");

    expect(debugSpy).not.toHaveBeenCalled();
  });

  test("DEBUG level writes debug", () => {
    log("DEBUG").debug("qwerty");

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG: qwerty"));
  });

  test("DEBUG level ignores trace", () => {
    log("DEBUG").trace("qwerty");

    expect(debugSpy).not.toHaveBeenCalled();
  });

  test("TRACE level writes trace to console.debug", () => {
    log("TRACE").trace("qwerty");

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("TRACE: qwerty"));
  });

  test("error prints stack when Error is passed", () => {
    const err = new Error("error");

    log("ERROR").error("failed", err);

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenNthCalledWith(1, expect.stringContaining("ERROR: failed"));
    expect(errorSpy).toHaveBeenNthCalledWith(2, err.stack);
  });
});
