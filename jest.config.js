export default {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  moduleNameMapper: {
    "^#config$": "<rootDir>/src/config/index.ts",
    "^#db$": "<rootDir>/src/db/index.ts",
    "^#lib/(.*)\\.(js|ts)$": "<rootDir>/src/lib/$1.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFiles: ["<rootDir>/test/testEnv.js"],
  restoreMocks: true,
};
