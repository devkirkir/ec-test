import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";

import { createTestApp, type TestApp } from "./testApp.js";

describe("[APP]", () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(() => {
    ctx.db.close();
  });

  describe("auth", () => {
    test("accepts a valid bearer token", async () => {
      const res = await ctx.api.get("/cryptocurrencies");

      expect(res.status).toBe(200);
    });

    test("accepts the scheme in any case", async () => {
      const res = await request(ctx.app).get("/cryptocurrencies").set("Authorization", `bearer ${process.env.API_KEY}`);

      expect(res.status).toBe(200);
    });

    test("rejects a request without Authorization header", async () => {
      const res = await request(ctx.app).get("/cryptocurrencies");

      expect(res.status).toBe(401);
      expect(res.headers["www-authenticate"]).toBe("Bearer");
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    test("rejects a wrong token", async () => {
      const res = await request(ctx.app).get("/cryptocurrencies").set("Authorization", "Bearer wrong-token");

      expect(res.status).toBe(401);
    });

    test("rejects a non-bearer scheme", async () => {
      const res = await request(ctx.app).get("/cryptocurrencies").set("Authorization", `Basic ${process.env.API_KEY}`);

      expect(res.status).toBe(401);
    });

    test("checks auth before routing", async () => {
      const res = await request(ctx.app).get("/unknown");

      expect(res.status).toBe(401);
    });
  });

  describe("docs", () => {
    test("serves OpenAPI spec without auth", async () => {
      const res = await request(ctx.app).get("/docs/openapi.json");

      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe("3.0.3");
      expect(Object.keys(res.body.paths)).toEqual(
        expect.arrayContaining([
          "/cryptocurrencies",
          "/cryptocurrencies/{symbol}",
          "/cryptocurrencies/{symbol}/price",
          "/cryptocurrencies/{symbol}/history",
        ]),
      );
    });

    test("serves Swagger UI without auth", async () => {
      const res = await request(ctx.app).get("/docs/");

      expect(res.status).toBe(200);
      expect(res.type).toBe("text/html");
    });
  });

  describe("errors", () => {
    test("returns 404 for an unknown route", async () => {
      const res = await ctx.api.get("/unknown");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Route GET /unknown not found" });
    });

    test("returns 400 for malformed JSON body", async () => {
      const res = await ctx.api.post("/cryptocurrencies").set("Content-Type", "application/json").send('{"symbol":');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid JSON body" });
    });

    test("hides internal error details", async () => {
      ctx.db.close();

      const res = await ctx.api.get("/cryptocurrencies");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });

      expect(ctx.errorSpy).toHaveBeenCalledWith(
        "Unhandled request error",
        expect.objectContaining({ message: "The database connection is not open" }),
      );
    });
  });
});
