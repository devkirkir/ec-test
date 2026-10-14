import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import HttpError from "#lib/httpError.js";

const createDigest = (apiKey: string) => createHash("sha256").update(apiKey).digest();

function auth(apiKey: string): RequestHandler {
  const userAuthKey = createDigest(apiKey);

  return (req, res, next) => {
    const header = req.get("Authorization");

    const [scheme, token] = header?.split(" ") ?? [];

    // здесь иишка подсказала прикольную вещь: timingSafeEqual. не задумывался о такой проверке, хотя на базовом уровне безопаности лежит...
    if (scheme !== "Bearer" || !token || !timingSafeEqual(createDigest(token), userAuthKey)) {
      res.set("WWW-Authenticate", "Bearer");

      return next(new HttpError(401, "Unauthorized"));
    }

    next();
  };
}

export default auth;
