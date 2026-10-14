import { type Database } from "better-sqlite3";
import save from "./methods/save.js";
import findByCryptocurrency from "./methods/findByCryptocurrency.js";
import findLatest from "./methods/findLatest.js";

interface Deps {
  db: Database;
}

export type PriceHistoryRepository = ReturnType<typeof priceHistoryRepository>;
function priceHistoryRepository(deps: Deps) {
  const { db } = deps;

  return {
    save: save(db),
    findByCryptocurrency: findByCryptocurrency(db),
    findLatest: findLatest(db),
  };
}

export default priceHistoryRepository;
