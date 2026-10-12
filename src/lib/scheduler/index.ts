interface Deps extends BaseDeps {
  intervalMs: number;
  task: (signal: AbortSignal) => Promise<void>;
}

function scheduler(name: string, deps: Deps) {
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;
  let isStopped = true;

  let abortController: AbortController | undefined;

  const exec = async () => {
    try {
      abortController = new AbortController();

      await deps.task(abortController.signal);
    } catch (err) {
      if (abortController?.signal.aborted) {
        deps.logger.info(`Scheduler ${name}: aborted`);

        return;
      }

      deps.logger.error(`Scheduler ${name}: task exec failed`, err);
    }
  };

  const loop = () => {
    running = exec().finally(() => {
      running = undefined;
      if (!isStopped) timer = setTimeout(loop, deps.intervalMs);
    });
  };

  const start = () => {
    if (!isStopped) return;

    isStopped = false;

    deps.logger.info(`Scheduler ${name}: started, interval ${deps.intervalMs}ms`);

    loop();
  };

  const stop = async () => {
    isStopped = true;

    if (abortController) abortController.abort();

    clearTimeout(timer);

    await running;
  };

  return { start, stop };
}

export default scheduler;
