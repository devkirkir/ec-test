FROM node:18.20.8-alpine AS base
WORKDIR /app

FROM base AS native
RUN apk add --no-cache python3 make g++

FROM native AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM native AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN mkdir -p /app/data && chown node:node /app/data
USER node

CMD ["node", "dist/index.js"]
