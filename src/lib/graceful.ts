type ShutdownCallback = () => void | Promise<void>;

interface ServiceStack {
  name: string;
  fn: ShutdownCallback;
}

function graceful() {
  const stack: ServiceStack[] = [];
  let isShutdown = false;

  const onShutdown = (name: string, fn: ShutdownCallback) => {
    stack.push({ name, fn });
  };

  const shutdown = async () => {
    if (isShutdown) return;
    isShutdown = true;

    for (let service = stack.pop(); service; service = stack.pop()) {
      try {
        console.error(`Stopping: ${service.name}`);

        await service.fn();
      } catch (err) {
        console.error(`Failed to stop: ${service.name}`, err);
      }
    }
  };

  return { onShutdown, shutdown };
}

export default graceful;
