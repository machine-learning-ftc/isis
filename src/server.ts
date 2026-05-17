import { Elysia } from "elysia";
import { errorMapperPlugin } from "./api/middleware/errorMapper";
import { metricsPlugin } from "./api/middleware/metrics";
import { requestIdPlugin } from "./api/middleware/requestId";
import { checkRoute } from "./api/routes/check.route";
import { checksRoute } from "./api/routes/checks.route";
import { healthRoute } from "./api/routes/health.route";
import type { Logger } from "./application/ports/Logger";
import type { CheckClaimDependencies } from "./application/use-cases/checkClaim";
import type { MetricsRegistry } from "./infra/metrics/registry";

export interface ServerDependencies extends CheckClaimDependencies {
  metrics: MetricsRegistry;
  logger: Logger;
  checkDatabase: () => Promise<boolean>;
  getUptimeMs: () => number;
}

export const createServer = (deps: ServerDependencies) =>
  new Elysia({ name: "fact-verification-api" })
    .use(requestIdPlugin)
    .use(metricsPlugin(deps.metrics))
    .use(errorMapperPlugin)
    .use(checkRoute(deps))
    .use(
      checksRoute({
        repository: deps.repository,
      }),
    )
    .use(
      healthRoute({
        checkDatabase: deps.checkDatabase,
        getUptimeMs: deps.getUptimeMs,
        logger: deps.logger,
      }),
    )
    .get("/metrics", async ({ set }) => {
      set.headers["content-type"] = deps.metrics.contentType;

      return deps.metrics.getMetrics();
    });
