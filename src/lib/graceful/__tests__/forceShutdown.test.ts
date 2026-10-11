import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { forceShutdown } from "../forceShutdown.js";

describe("[GRACEFUL SHUTDOWN] forceShutdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("rejects with service name and timeout after ms", async () => {
    const { promise } = forceShutdown("db", 1000);
    const assertion = expect(promise).rejects.toThrow("Service db didn't stop within 1000ms");

    await jest.advanceTimersByTimeAsync(1000);

    await assertion;
  });

  test("does not reject before ms", async () => {
    const { promise } = forceShutdown("db", 1000);

    let rejected = false;

    promise.catch(() => {
      rejected = true;
    });

    await jest.advanceTimersByTimeAsync(999);

    expect(rejected).toBe(false);
  });

  test("cancel prevents rejection", async () => {
    const { promise, cancel } = forceShutdown("db", 1000);

    let rejected = false;

    promise.catch(() => {
      rejected = true;
    });

    cancel();

    await jest.advanceTimersByTimeAsync(1000);

    expect(rejected).toBe(false);
  });

  test("cancel clears the timer", () => {
    const { cancel } = forceShutdown("db", 1000);

    expect(jest.getTimerCount()).toBe(1);

    cancel();

    expect(jest.getTimerCount()).toBe(0);
  });
});
