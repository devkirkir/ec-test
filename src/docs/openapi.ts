const symbolParam = {
  name: "symbol",
  in: "path",
  required: true,
  description: "Символ криптовалюты, регистр не важен",
  schema: { type: "string", pattern: "^[A-Za-z0-9]{1,10}$", example: "BTC" },
};

const errorResponse = (description: string, example: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      example: { error: example },
    },
  },
});

const responses = {
  BadRequest: errorResponse("Невалидные входные данные", "symbol must be 1-10 latin letters or digits"),
  Unauthorized: {
    ...errorResponse("Отсутствует или неверный API key", "Unauthorized"),
    headers: { "WWW-Authenticate": { schema: { type: "string", example: "Bearer" } } },
  },
  NotFound: errorResponse("Криптовалюта не отслеживается", "Cryptocurrency BTC not found"),
  InternalError: errorResponse("Внутренняя ошибка сервера", "Internal server error"),
};

const jsonContent = (schema: object) => ({ "application/json": { schema } });

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Crypto Prices API",
    version: "1.0.0",
    description:
      "REST API для отслеживания цен криптовалют. Цены синхронизируются из CoinMarketCap фоновой задачей " +
      "и сохраняются в историю. Все цены возвращаются в единой валюте приложения.",
  },
  servers: [{ url: "/" }],
  security: [{ bearerAuth: [] }],
  tags: [{ name: "Cryptocurrencies" }],
  paths: {
    "/cryptocurrencies": {
      get: {
        tags: ["Cryptocurrencies"],
        summary: "Список отслеживаемых криптовалют",
        responses: {
          200: {
            description: "Список криптовалют с последней известной ценой",
            content: jsonContent({ type: "array", items: { $ref: "#/components/schemas/Cryptocurrency" } }),
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        tags: ["Cryptocurrencies"],
        summary: "Начать отслеживать криптовалюту",
        description:
          "Проверяет символ в CoinMarketCap. Если символу соответствует несколько монет, берётся активная с наивысшим рангом.",
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/ObserveRequest" }),
        },
        responses: {
          201: {
            description: "Криптовалюта добавлена",
            content: jsonContent({ $ref: "#/components/schemas/Cryptocurrency" }),
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: errorResponse("Символ не найден в CoinMarketCap или нет активных монет", "Cryptocurrency XYZ not found"),
          409: errorResponse("Криптовалюта уже отслеживается", "Cryptocurrency BTC is already tracked"),
          500: { $ref: "#/components/responses/InternalError" },
          502: errorResponse("Ошибка CoinMarketCap", "CoinMarketCap is unavailable"),
          503: errorResponse("Превышен лимит запросов к CoinMarketCap", "CoinMarketCap is unavailable"),
          504: errorResponse("Таймаут запроса к CoinMarketCap", "CoinMarketCap is unavailable"),
        },
      },
    },
    "/cryptocurrencies/{symbol}": {
      parameters: [symbolParam],
      get: {
        tags: ["Cryptocurrencies"],
        summary: "Отслеживаемая криптовалюта",
        responses: {
          200: {
            description: "Криптовалюта",
            content: jsonContent({ $ref: "#/components/schemas/Cryptocurrency" }),
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
      patch: {
        tags: ["Cryptocurrencies"],
        summary: "Изменить настройки отслеживания",
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/UpdateRequest" }),
        },
        responses: {
          200: {
            description: "Обновлённая криптовалюта",
            content: jsonContent({ $ref: "#/components/schemas/Cryptocurrency" }),
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["Cryptocurrencies"],
        summary: "Перестать отслеживать криптовалюту",
        description: "Удаляет криптовалюту вместе с историей цен.",
        responses: {
          204: { description: "Удалено" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/cryptocurrencies/{symbol}/price": {
      parameters: [symbolParam],
      get: {
        tags: ["Cryptocurrencies"],
        summary: "Актуальная цена",
        description:
          "Если syncEnabled = true и цена уже синхронизирована, возвращается последняя цена из истории " +
          "(source = history). Если syncEnabled = false или синхронизации ещё не было, цена запрашивается " +
          "напрямую из CoinMarketCap (source = coinmarketcap) и в историю не сохраняется.",
        responses: {
          200: {
            description: "Актуальная цена",
            content: jsonContent({ $ref: "#/components/schemas/PriceResponse" }),
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/InternalError" },
          502: errorResponse(
            "Ошибка CoinMarketCap или нет цены в ответе (только при запросе в CoinMarketCap)",
            "CoinMarketCap returned no price for BTC",
          ),
          503: errorResponse(
            "Превышен лимит запросов к CoinMarketCap (только при запросе в CoinMarketCap)",
            "CoinMarketCap is unavailable",
          ),
          504: errorResponse(
            "Таймаут запроса к CoinMarketCap (только при запросе в CoinMarketCap)",
            "CoinMarketCap is unavailable",
          ),
        },
      },
    },
    "/cryptocurrencies/{symbol}/history": {
      parameters: [symbolParam],
      get: {
        tags: ["Cryptocurrencies"],
        summary: "История цен",
        parameters: [
          {
            name: "from",
            in: "query",
            description: "Начало периода по fetchedAt (ISO 8601), включительно",
            schema: { type: "string", format: "date-time", example: "2026-10-01T00:00:00Z" },
          },
          {
            name: "to",
            in: "query",
            description: "Конец периода по fetchedAt (ISO 8601), включительно. Не раньше from",
            schema: { type: "string", format: "date-time", example: "2026-10-15T00:00:00Z" },
          },
          {
            name: "order",
            in: "query",
            description: "Сортировка по fetchedAt",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          200: {
            description: "Страница истории цен",
            content: jsonContent({ $ref: "#/components/schemas/HistoryResponse" }),
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key приложения (переменная окружения API_KEY)",
      },
    },
    responses,
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
      PriceRecord: {
        type: "object",
        required: ["price", "fetchedAt", "cmcUpdatedAt"],
        properties: {
          price: { type: "number", minimum: 0, example: 67234.12 },
          fetchedAt: {
            type: "string",
            format: "date-time",
            description: "Когда цена получена сервисом",
          },
          cmcUpdatedAt: {
            type: "string",
            format: "date-time",
            description: "Когда цена обновлена на стороне CoinMarketCap",
          },
        },
      },
      Cryptocurrency: {
        type: "object",
        required: ["id", "cmcId", "symbol", "name", "syncEnabled", "lastSyncedAt", "latestPrice"],
        properties: {
          id: { type: "integer", example: 1 },
          cmcId: { type: "integer", description: "ID в CoinMarketCap", example: 1 },
          symbol: { type: "string", example: "BTC" },
          name: { type: "string", example: "Bitcoin" },
          syncEnabled: { type: "boolean", description: "Участвует ли в фоновой синхронизации" },
          lastSyncedAt: { type: "string", format: "date-time", nullable: true },
          latestPrice: {
            nullable: true,
            allOf: [{ $ref: "#/components/schemas/PriceRecord" }],
          },
        },
      },
      ObserveRequest: {
        type: "object",
        required: ["symbol"],
        additionalProperties: false,
        properties: {
          symbol: { type: "string", pattern: "^[A-Za-z0-9]{1,10}$", example: "BTC" },
        },
      },
      UpdateRequest: {
        type: "object",
        required: ["syncEnabled"],
        additionalProperties: false,
        properties: {
          syncEnabled: { type: "boolean", example: false },
        },
      },
      PriceResponse: {
        allOf: [
          {
            type: "object",
            required: ["symbol", "currency", "source"],
            properties: {
              symbol: { type: "string", example: "BTC" },
              currency: { type: "string", example: "USD" },
              source: {
                type: "string",
                enum: ["history", "coinmarketcap"],
                description: "Откуда получена цена: из истории синхронизации или напрямую из CoinMarketCap",
              },
            },
          },
          { $ref: "#/components/schemas/PriceRecord" },
        ],
      },
      HistoryResponse: {
        type: "object",
        required: ["symbol", "currency", "items", "pagination"],
        properties: {
          symbol: { type: "string", example: "BTC" },
          currency: { type: "string", example: "USD" },
          items: { type: "array", items: { $ref: "#/components/schemas/PriceRecord" } },
          pagination: {
            type: "object",
            required: ["limit", "offset", "total"],
            properties: {
              limit: { type: "integer", example: 10 },
              offset: { type: "integer", example: 0 },
              total: { type: "integer", example: 42 },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;
