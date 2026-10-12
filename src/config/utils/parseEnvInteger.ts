import { checkEnvExisting } from "./checkEnvExisting.js";

export const parseEnvInteger = (key: string) => {
  const value = Number(checkEnvExisting(key));
  if (!Number.isInteger(value)) throw new Error(`${key} must be integer`);
  if (value <= 0) throw new Error(`${key} must be positive and more than zero`);

  return value;
};
