import SQLite, { type Database } from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { applySchema } from "./schema.js";

let instance: Database | undefined;

export function init(dbPath: string): Database {
  if (instance) return instance;

  const trimmed = dbPath.trim();
  const resolvedPath = trimmed === ":memory:" ? trimmed : path.resolve(trimmed);

  if (resolvedPath !== ":memory:") {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  instance = new SQLite(resolvedPath);

  instance.pragma("journal_mode = WAL");
  instance.pragma("busy_timeout = 5000");
  instance.pragma("synchronous = NORMAL");
  instance.pragma("foreign_keys = true");

  applySchema(instance);

  return instance;
}

export function close() {
  if (!instance) return;

  instance.close();
  instance = undefined;
}
