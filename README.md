# Cryptocurrencies Prices API

Cервис для отслеживания цен криптовалют через CoinMarketCap.

**Стек:** Node 18, TS, Express 5, SQLite (`better-sqlite3`, raw SQL), axios, Jest + Supertest, Swagger, Docker + docker-compose.

> Тестировалось на ноде 18.20.8

## Быстрый старт (Docker)

```bash
## Нужно заполнить .env (пример в .env.example) послечего выполнить:

docker compose up -d --build
```

Сервис поднимается на `http://0.0.0.0:APP_PORT`.
Доступ к SwaggerUI: `http://0.0.0.0:APP_PORT/docs`

## Локальный запуск

Нужен Node.js 18.20.8 или новее.

```bash
npm ci

npm run build

# Команда для генерации API_KEY.
npm run gen:key

# После чего нужно заполнить .env (пример в .env.example)

# Сборка и запуск
npm run start:local
```

Сервис поднимается на `http://localhost:APP_PORT`
Доступ к SwaggerUI: `http://localhost:APP_PORT/docs`

## API

Все эндпоинты (кроме `/docs`) требуют заголовок:

```
Authorization: Bearer <API_KEY>
```

#### Примеры

Полный пример можно посмотреть в Swagger: `http://localhost:APP_PORT/docs`

```bash
# Начать отслеживать криптовалюту
curl -X POST http://localhost:5000/cryptocurrencies \
	-H "Authorization: Bearer $API_KEY" \
	-H "Content-Type: application/json" \
	-d '{"symbol":"BTC"}'

# Получить список отслеживаемых криптовалют
curl http://localhost:5000/cryptocurrencies \
	-H "Authorization: Bearer $API_KEY"

# Получить информацию о криптовалюте (отслеживается ли, включена ли синхронизация)
curl http://localhost:5000/cryptocurrencies/BTC \
	-H "Authorization: Bearer $API_KEY"

# Получить актуальную цену по криптовалюте
curl http://localhost:5000/cryptocurrencies/BTC/price \
	-H "Authorization: Bearer $API_KEY"

# Получить историю цен по криптовалюте (дефолт: 10 последних записей)
curl http://localhost:5000/cryptocurrencies/BTC/history \
	-H "Authorization: Bearer $API_KEY"

# Фильтр получения истории цен (подробнее в свагге)
curl "http://localhost:5000/cryptocurrencies/BTC/history?from=2026-10-01&to=2026-10-15T23:59:59Z&order=asc&limit=20&offset=20" \
	-H "Authorization: Bearer $API_KEY"

# Включить/отключить ("syncEnabled": true/false) синхронизацию
curl -X PATCH http://localhost:5000/cryptocurrencies/BTC \
	-H "Authorization: Bearer $API_KEY" \
	-H "Content-Type: application/json" \
	-d '{"syncEnabled": false}'

# Удалить из отслеживаемых
curl -X DELETE http://localhost:5000/cryptocurrencies/BTC \
	-H "Authorization: Bearer $API_KEY"
```

## Фоновая синхронизация

Задача `syncPrice` раз в `APP_SCHEDULE_INTERVAL_SEC` секунд забирает цены всех криптовалют с `syncEnabled: true` и сохраняет их в `price_history` одной транзакцией.

- Следующий запуск планируется только после завершения предыдущего, поэтому прогоны не накладываются.
- Ошибка CMC логируется и не роняет процесс, следующая попытка будет по расписанию.

### Graceful shutdown

По `SIGINT` или `SIGTERM` сервисы останавливаются в обратном порядке регистрации (LIFO):

1. scheduler: текущий запрос к CMC прерывается через `AbortSignal`, новые запуски не планируются;
2. HTTP-сервер: перестаёт принимать соединения и закрывает простаивающие;
3. БД закрывается.

На каждый шаг отводится `GRACEFUL_TIMEOUT_SHUTDOWN_MS`. Повторный сигнал во время остановки завершает процесс принудительно.

## Тесты

```bash
npm test
```

## Структура

```
src/
├── index.ts # точка входа
├── app.ts # билд express приложения
├── config/ # чтение и валидация переменных окружения
├── db/ # подключение к БД и схема
├── docs/openapi.ts # OpenAPI
├── integrations/coinmarketcap/ # интеграция
├── repositories/ # raw SQL доступ к данным
├── routes/ # обработчики HTTP и валидация входных данных
├── middlewares/ # мидлвари (auth, notFound, обработчик ошибок)
├── tasks/ # фоновые задачи (syncPrice)
└── lib/ # logger, scheduler, graceful, утилиты
```

## Решения и отступления от ТЗ

ТЗ разрешает только перечисленные библиотеки и стандартные возможности Node.js. Ниже зависимости сверх списка и почему без них не обойтись:

- **`better-sqlite3`**. Драйвер SQLite нужен в любом случае: встроенный модуль `node:sqlite` появился только в Node.js 22.5, а проект работает на Node.js 18. Драйвер используется только для выполнения raw SQL, без ORM и query builder.
- **`dotenv`**: Загружает `.env` при локальном запуске. Встроенные `--env-file` и `process.loadEnvFile()` появились только в Node.js 20.6 и 20.12. В Docker переменные передаются через `env_file` в compose.
- **`swagger-ui-express`**: Отдаёт Swagger UI на `/docs`. Swagger указан в стеке ТЗ, это его стандартная интеграция с Express. Спецификация хранится TS-объектом, поэтому YAML-парсер не нужен.
