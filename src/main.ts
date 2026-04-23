import type { Clock } from "./application/ports/Clock";
import { loadEnv } from "./infra/config/env";
import { createDatabaseClient } from "./infra/db/client";
import { createFactCheckRepository } from "./infra/db/factCheck.repository";
import { createGoogleFactCheckProvider } from "./infra/http/googleFactCheck.adapter";
import { createMlProvider } from "./infra/http/mlProvider.adapter";
import { createLogger } from "./infra/logging/logger";
import { createMetricsRegistry } from "./infra/metrics/registry";
import { createServer } from "./server";

const env = loadEnv();
const logger = createLogger(env);
const metrics = createMetricsRegistry();
const databaseClient = createDatabaseClient(env);

const clock: Clock = {
  now: () => new Date(),
};

const factCheckRepository = createFactCheckRepository(databaseClient);
const startedAt = Date.now();

const app = createServer({
  factProvider: createGoogleFactCheckProvider({
    apiKey: env.FACT_CHECK_API_KEY,
    logger,
    metrics,
    timeoutMs: env.HTTP_TIMEOUT_MS,
    url: env.FACT_CHECK_API_URL,
  }),
  mlProvider: createMlProvider({
    apiKey: env.ML_SERVICE_API_KEY,
    logger,
    metrics,
    timeoutMs: env.HTTP_TIMEOUT_MS,
    url: env.ML_SERVICE_URL,
  }),
  repository: factCheckRepository,
  clock,
  logger,
  metrics,
  checkDatabase: () => databaseClient.ping(),
  getUptimeMs: () => Date.now() - startedAt,
});

const server = app.listen({
  hostname: env.HOST,
  port: env.PORT,
});

logger.info("Fact Verification API started.", {
  host: env.HOST,
  port: env.PORT,
});

const shutdown = async (signal: string) => {
  logger.info("Shutting down service.", {
    signal,
  });

  server.stop();
  await databaseClient.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
