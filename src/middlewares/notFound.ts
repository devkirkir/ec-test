import HttpError from "#lib/httpError.js";
import type { RequestHandler } from "express";

const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route ${req.method} ${req.path} not found`));
};

export default notFound;
