import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

let instance: DatabaseSync | undefined;

export function init(dbPath: string = "data/app.sqlite"): DatabaseSync {
  if (instance) return instance;

  const trimmed = dbPath.trim();
  const resolvedPath = trimmed === ":memory:" ? trimmed : path.resolve(trimmed);

  if (resolvedPath !== ":memory:") {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  instance = new DatabaseSync(resolvedPath);

  return instance;
}

export function close() {
  if (!instance) return;

  instance.close();
  instance = undefined;
}
