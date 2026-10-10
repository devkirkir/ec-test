import { checkEnvExisting } from "./checkEnvExisting.js";

export const parseEnvPort = (key: string) => {
  const value = Number(checkEnvExisting(key));
  if (!Number.isInteger(value) || value <= 0 || value > 65535) throw new Error(`${key} is not a valid port`);

  return value;
};
