import type { Request, Response } from "express";
import type { CryptocurrenciesRepository } from "#repositories/cryptocurrencies/index.js";
import type { Cryptocurrency } from "#repositories/cryptocurrencies/types.js";

interface Deps {
  cryptocurrencies: CryptocurrenciesRepository;
}

const list = (deps: Deps) => (_req: Request, res: Response<Cryptocurrency[]>) => {
  res.json(deps.cryptocurrencies.findAll());
};

export default list;
