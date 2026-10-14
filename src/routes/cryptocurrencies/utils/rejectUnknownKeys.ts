import HttpError from "#lib/httpError.js";

type Source = "query params" | "fields";

function rejectUnknownKeys(value: Record<string, unknown>, allowed: string[], source: Source) {
  const unknownKeys = Object.keys(value).filter((key) => !allowed.includes(key));

  if (unknownKeys.length > 0) throw new HttpError(400, `Unknown ${source}: ${unknownKeys.join(", ")}`);
}

export default rejectUnknownKeys;
