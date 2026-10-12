import { checkEnvExisting } from "./checkEnvExisting.js";

const currencies = ["USD"] as const;
export type EnvCurrency = (typeof currencies)[number];

const isEnvCurrency = (value: string): value is EnvCurrency => (currencies as readonly string[]).includes(value);

export const parseEnvConvertCurrency = (key: string) => {
  const value = checkEnvExisting(key).trim();
  if (!isEnvCurrency(value)) throw new Error(`${key} is not a valid currency`);

  return value;
};
