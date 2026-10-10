import { checkEnvExisting } from "./checkEnvExisting.js";

export const parseEnvInteger = (key: string, defaultValue: number) => {
  const value = Number(checkEnvExisting(key));

  return Number.isInteger(value) ? value : Number(defaultValue.toFixed(0));
};
