import { InvalidInputError } from "../../domain/errors/DomainError";

export type AppEnv = "development" | "test" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Env {
  ENV: AppEnv;
  HOST: string;
  PORT: number;
  DATABASE_URL: string;
  FACT_CHECK_API_URL: string;
  FACT_CHECK_API_KEY: string;
  ML_SERVICE_URL: string;
  ML_SERVICE_API_KEY: string;
  HTTP_TIMEOUT_MS: number;
  LOG_LEVEL: LogLevel;
}

const readRequired = (
  source: Record<string, string | undefined>,
  key: keyof Env,
): string => {
  const value = source[key];

  if (!value) {
    throw new InvalidInputError(
      `Missing required environment variable: ${key}.`,
    );
  }

  return value;
};

const parseNumber = (value: string, key: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidInputError(`${key} must be a positive integer.`);
  }

  return parsed;
};

const parseAppEnv = (value: string): AppEnv => {
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  throw new InvalidInputError("ENV must be development, test, or production.");
};

const parseLogLevel = (value: string): LogLevel => {
  if (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  ) {
    return value;
  }

  throw new InvalidInputError("LOG_LEVEL must be debug, info, warn, or error.");
};

export const loadEnv = (
  source: Record<string, string | undefined> = Bun.env,
): Env => ({
  ENV: parseAppEnv(source.ENV ?? "development"),
  HOST: source.HOST ?? "0.0.0.0",
  PORT: parseNumber(source.PORT ?? "3000", "PORT"),
  DATABASE_URL: readRequired(source, "DATABASE_URL"),
  FACT_CHECK_API_URL: readRequired(source, "FACT_CHECK_API_URL"),
  FACT_CHECK_API_KEY: readRequired(source, "FACT_CHECK_API_KEY"),
  ML_SERVICE_URL: readRequired(source, "ML_SERVICE_URL"),
  ML_SERVICE_API_KEY: readRequired(source, "ML_SERVICE_API_KEY"),
  HTTP_TIMEOUT_MS: parseNumber(
    source.HTTP_TIMEOUT_MS ?? "700",
    "HTTP_TIMEOUT_MS",
  ),
  LOG_LEVEL: parseLogLevel(source.LOG_LEVEL ?? "info"),
});
