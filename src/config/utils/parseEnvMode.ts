import { checkEnvExisting } from "./checkEnvExisting.js";

const modes = ["development", "production", "test"] as const;
export type EnvMode = (typeof modes)[number];

const isEnvMode = (value: string): value is EnvMode => (modes as readonly string[]).includes(value);

export const parseEnvMode = (key: string) => {
  const value = checkEnvExisting(key).toLowerCase();
  if (!isEnvMode(value)) throw new Error(`${key} is not a valid mode`);

  return value;
};
