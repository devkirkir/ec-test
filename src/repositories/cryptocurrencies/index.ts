import { type Database } from "better-sqlite3";
import create from "./methods/create.js";

interface Deps {
  db: Database;
}

export type CryptocurrenciesRepository = ReturnType<typeof cryptocurrenciesRepository>;
function cryptocurrenciesRepository(deps: Deps) {
  return {
    create: create(deps.db),
  };
}

export default cryptocurrenciesRepository;
