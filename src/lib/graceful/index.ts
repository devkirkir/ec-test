import type { Config } from "#config";
import { forceShutdown } from "./forceShutdown.js";

type ShutdownCallback = () => void | Promise<void>;

interface ServiceStack {
  name: string;
  fn: ShutdownCallback;
}

interface Deps extends BaseDeps {
  config: Config;
}

function graceful(deps: Deps) {
  const stack: ServiceStack[] = [];

  let isShutdown = false;
  let isDone = false;

  async function stopService(service: ServiceStack) {
    try {
      deps.logger.info(`Stopping service: ${service.name}`);

      const forced = forceShutdown(service.name, deps.config.graceful.timeoutMs);

      await Promise.race([Promise.resolve().then(service.fn), forced.promise]).finally(forced.cancel);
    } catch (err) {
      deps.logger.error(`Failed to stop: ${service.name}`, err);
    }
  }

  const onShutdown = (name: string, fn: ShutdownCallback) => {
    if (isDone) {
      deps.logger.warn(`Service ${name} was registered after shutdown init. Stopping...`);

      stopService({ name, fn });
    } else {
      stack.push({ name, fn });
    }
  };

  const shutdown = async () => {
    if (isShutdown) return;

    isShutdown = true;

    for (let service = stack.pop(); service; service = stack.pop()) {
      await stopService(service);
    }

    isDone = true;
  };

  return { onShutdown, shutdown };
}

export default graceful;
