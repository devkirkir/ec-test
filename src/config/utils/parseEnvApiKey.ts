import { checkEnvExisting } from "./checkEnvExisting.js";

export const parseEnvApiKey = (key: string) => {
  const value = checkEnvExisting(key).trim();
  if (value.length < 32) throw new Error(`${key} must be at least ${32} characters`);

  return value;
};
