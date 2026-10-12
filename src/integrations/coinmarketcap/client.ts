import config from "#config";
import axios from "axios";
import { errorMapper } from "./errors/errorMapper.js";

export const coinMarketClient = axios.create({
  baseURL: config.integrations.coinmarketcap.url,
  timeout: config.integrations.coinmarketcap.timeout,
  headers: {
    "X-CMC_PRO_API_KEY": config.integrations.coinmarketcap.key,
  },
});

coinMarketClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(errorMapper(err)),
);
