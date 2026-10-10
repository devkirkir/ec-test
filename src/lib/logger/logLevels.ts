export const LogLevel = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 } as const;

export type LogLevelName = keyof typeof LogLevel;

export const isLogLevelName = (value: string): value is LogLevelName => Object.hasOwn(LogLevel, value);
