import type { Logger } from "#lib/logger/factory.ts";

declare global {
  interface BaseDeps {
    logger: Logger;
  }
}

export {};
