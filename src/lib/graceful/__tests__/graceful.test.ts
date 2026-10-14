import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import config from "#config";
import loggerFactory from "#lib/logger/factory.js";
import graceful from "../index.js";

const TIMEOUT_MS = 1000;

describe("[GRACEFUL SHUTDOWN] graceful", () => {
  const logger = loggerFactory("ERROR");
  const testConfig = { ...config, graceful: { timeoutMs: TIMEOUT_MS } };

  let errorSpy: ReturnType<typeof jest.spyOn>;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(logger, "info").mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setup = () => graceful({ logger, config: testConfig });

  test("stops services in reverse order of registration", async () => {
    const { onShutdown, shutdown } = setup();
    const order: string[] = [];

    onShutdown("db", () => {
      order.push("db");
    });
    onShutdown("server", () => {
      order.push("server");
    });
    onShutdown("scheduler", () => {
      order.push("scheduler");
    });

    await shutdown();

    expect(order).toEqual(["scheduler", "server", "db"]);
  });

  test("waits for async service before stopping the next one", async () => {
    const { onShutdown, shutdown } = setup();
    const order: string[] = [];

    onShutdown("db", () => {
      order.push("db");
    });
    onShutdown("server", async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      order.push("server");
    });

    const done = shutdown();

    await jest.advanceTimersByTimeAsync(499);
    expect(order).toEqual([]);

    await jest.advanceTimersByTimeAsync(1);
    await done;

    expect(order).toEqual(["server", "db"]);
  });

  test.each([
    [
      "throws",
      () => {
        throw new Error("error");
      },
    ],
    ["rejects", () => Promise.reject(new Error("error"))],
  ])("logs service that %s and continues with the rest", async (_, failing) => {
    const { onShutdown, shutdown } = setup();
    const db = jest.fn<() => void>();

    onShutdown("db", db);
    onShutdown("server", failing);

    await shutdown();

    expect(errorSpy).toHaveBeenCalledWith("Failed to stop: server", expect.objectContaining({ message: "error" }));
    expect(db).toHaveBeenCalledTimes(1);
  });

  test("forces hanging service after timeout and continues with the rest", async () => {
    const { onShutdown, shutdown } = setup();
    const db = jest.fn<() => void>();

    onShutdown("db", db);
    onShutdown("server", () => new Promise<void>(() => {}));

    const done = shutdown();

    await jest.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(db).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    await done;

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to stop: server",
      expect.objectContaining({ message: `Service server didn't stop within ${TIMEOUT_MS}ms` }),
    );
    expect(db).toHaveBeenCalledTimes(1);
  });

  test("clears force timer when service stops in time", async () => {
    const { onShutdown, shutdown } = setup();

    onShutdown("db", () => {});

    await shutdown();

    expect(jest.getTimerCount()).toBe(0);
  });

  test("stops every service only once on repeated shutdown", async () => {
    const { onShutdown, shutdown } = setup();
    const db = jest.fn<() => void>();

    onShutdown("db", db);

    await Promise.all([shutdown(), shutdown()]);
    await shutdown();

    expect(db).toHaveBeenCalledTimes(1);
  });

  test("stops service registered during shutdown", async () => {
    const { onShutdown, shutdown } = setup();
    const late = jest.fn<() => void>();

    onShutdown("server", async () => {
      onShutdown("late", late);
    });

    await shutdown();

    expect(late).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("immediately stops service registered after shutdown and warns", async () => {
    const { onShutdown, shutdown } = setup();
    const late = jest.fn<() => void>();

    await shutdown();

    onShutdown("late", late);
    await jest.advanceTimersByTimeAsync(0);

    expect(warnSpy).toHaveBeenCalledWith("Service late was registered after shutdown init. Stopping...");
    expect(late).toHaveBeenCalledTimes(1);
  });
});
