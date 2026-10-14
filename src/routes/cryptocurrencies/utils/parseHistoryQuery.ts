import HttpError from "#lib/httpError.js";

import rejectUnknownKeys from "./rejectUnknownKeys.js";

import type { HistoryFilters, HistoryOrder } from "#repositories/priceHistory/types.js";

const ALLOWED_PARAMS = ["from", "to", "limit", "offset", "order"];
const ORDERS: HistoryOrder[] = ["asc", "desc"];

const INTEGER_PATTERN = /^\d+$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

function parseHistoryQuery(query: Record<string, unknown>): HistoryFilters {
  rejectUnknownKeys(query, ALLOWED_PARAMS, "query params");

  const from = parseDate("from", query.from);
  const to = parseDate("to", query.to);

  if (from && to && from > to) throw new HttpError(400, "from must be less than or equal to to");

  return {
    order: parseOrder(query.order),
    limit: parseInteger("limit", query.limit, { min: 1, max: 100 }) ?? 10,
    offset: parseInteger("offset", query.offset, { min: 0, max: Number.MAX_SAFE_INTEGER }) ?? 0,
    from,
    to,
  };
}

function parseDate(name: string, value: unknown): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpError(400, `${name} must be a single value`);

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) throw new HttpError(400, `${name} must be an ISO 8601 date`);

  const [, year, month, day] = match.map(Number);

  const calendarDate = new Date(Date.UTC(year!, month! - 1, day!));

  if (calendarDate.getUTCMonth() !== month! - 1 || calendarDate.getUTCDate() !== day) {
    throw new HttpError(400, `${name} must be an existing date`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${name} must be an date`);

  return date;
}

function parseInteger(name: string, value: unknown, range: { min: number; max: number }): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpError(400, `${name} must be a single value`);

  const number = Number(value);
  if (!INTEGER_PATTERN.test(value) || number < range.min || number > range.max) {
    throw new HttpError(400, `${name} must be an integer between ${range.min} and ${range.max}`);
  }

  return number;
}

function parseOrder(value: unknown): HistoryOrder {
  if (value === undefined) return "desc";

  const order = ORDERS.find((order) => order === value);
  if (!order) throw new HttpError(400, `order must be one of: ${ORDERS.join(", ")}`);

  return order;
}

export default parseHistoryQuery;
