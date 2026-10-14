import { type Database } from "better-sqlite3";
import create from "./methods/create.js";
import remove from "./methods/remove.js";
import findAll from "./methods/findAll.js";
import findBySymbol from "./methods/findBySymbol.js";

interface Deps {
  db: Database;
}

export type CryptocurrenciesRepository = ReturnType<typeof cryptocurrenciesRepository>;
function cryptocurrenciesRepository(deps: Deps) {
  const { db } = deps;

  return {
    create: create(db),
    remove: remove(db),
    findAll: findAll(db),
    findBySymbol: findBySymbol(db),
  };
}

export default cryptocurrenciesRepository;
