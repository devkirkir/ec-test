import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import loggerFactory from "#lib/logger/factory.js";
import scheduler from "../index.js";

describe("[SCHEDULER] scheduler", () => {
  const logger = loggerFactory("ERROR");
  let infoSpy: ReturnType<typeof jest.spyOn>;
  let errorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.useFakeTimers();
    infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("runs task immediately and then every interval", async () => {
    const task = jest.fn(async () => {});
    const job = scheduler("test", { logger, intervalMs: 1000, task });

    job.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledTimes(3);

    await job.stop();
  });

  test("ignores repeated start", async () => {
    const task = jest.fn(async () => {});
    const job = scheduler("test", { logger, intervalMs: 1000, task });

    job.start();
    job.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(task).toHaveBeenCalledTimes(1);

    await job.stop();
  });

  test("logs failed task and keeps running", async () => {
    const task = jest.fn(async () => {}).mockRejectedValueOnce(new Error("boom"));
    const job = scheduler("test", { logger, intervalMs: 1000, task });

    job.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(errorSpy).toHaveBeenCalledWith("Scheduler test: task exec failed", expect.any(Error));

    await jest.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);

    await job.stop();
  });

  test("does not overlap ticks when task is slower than interval", async () => {
    let active = 0;
    let maxActive = 0;
    const task = jest.fn(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      active--;
    });
    const job = scheduler("test", { logger, intervalMs: 1000, task });

    job.start();
    await jest.advanceTimersByTimeAsync(10_000);

    expect(maxActive).toBe(1);

    const stopped = job.stop();
    await jest.advanceTimersByTimeAsync(3000);
    await stopped;
  });

  test("stop waits for running task and prevents next ticks", async () => {
    let finished = false;
    const task = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      finished = true;
    });
    const job = scheduler("test", { logger, intervalMs: 1000, task });

    job.start();
    await jest.advanceTimersByTimeAsync(100);

    const stopped = job.stop();
    await jest.advanceTimersByTimeAsync(500);
    await stopped;
    expect(finished).toBe(true);

    await jest.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("passes a fresh AbortSignal to each run", async () => {
    const signals: AbortSignal[] = [];
    const task = jest.fn(async (signal: AbortSignal) => {
      signals.push(signal);
    });
    const job = scheduler("test", { logger, intervalMs: 1000, task });

    job.start();
    await jest.advanceTimersByTimeAsync(1000);

    expect(signals).toHaveLength(2);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0]).not.toBe(signals[1]);

    await job.stop();
  });

  test("stop aborts running task without logging an error", async () => {
    let received: AbortSignal | undefined;
    const task = jest.fn(
      (signal: AbortSignal) =>
        new Promise<void>((_, reject) => {
          received = signal;
          signal.addEventListener("abort", () => reject(new Error("canceled")));
        }),
    );
    const job = scheduler("test", { logger, intervalMs: 1000, task });

    job.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(received?.aborted).toBe(false);

    await job.stop();

    expect(received?.aborted).toBe(true);
    expect(infoSpy).toHaveBeenCalledWith("Scheduler test: aborted");
    expect(errorSpy).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("stop before start resolves", async () => {
    const job = scheduler("test", { logger, intervalMs: 1000, task: async () => {} });

    await expect(job.stop()).resolves.toBeUndefined();
  });
});
