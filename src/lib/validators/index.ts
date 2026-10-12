export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0;

export const isString = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

export function isDate(value: unknown): value is Date {
  if (!isString(value)) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return true;
}
