import type { Logger } from "#lib/logger/index.ts";

declare global {
  interface BaseDeps {
    logger: Logger;
  }
}

export {};
