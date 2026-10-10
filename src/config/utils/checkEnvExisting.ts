export const checkEnvExisting = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not specified in .env`);

  return value;
};
