import axios from "axios";
import { errorMapper } from "./errors/errorMapper.js";

import type { Config } from "#config";

export type CoinMarketCapConfig = Config["integrations"]["coinmarketcap"];

export function createCoinMarketClient(config: CoinMarketCapConfig) {
  const client = axios.create({
    baseURL: config.url,
    timeout: config.timeout,
    headers: {
      "X-CMC_PRO_API_KEY": config.key,
    },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(errorMapper(err)),
  );

  return client;
}
