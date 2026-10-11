export function forceShutdown(serviceName: string, ms: number) {
  let timeout: NodeJS.Timeout;

  const promise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Service ${serviceName} didn't stop within ${ms}ms`));
    }, ms);

    timeout.unref();
  });

  const cancel = () => clearTimeout(timeout);

  return { promise, cancel };
}
