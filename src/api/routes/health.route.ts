import { Elysia, t } from "elysia";
import type { Logger } from "../../application/ports/Logger";

const healthResponseSchema = t.Object({
  status: t.Union([t.Literal("ok"), t.Literal("degraded")]),
  uptimeMs: t.Number({ minimum: 0 }),
  db: t.Union([t.Literal("up"), t.Literal("down")]),
});

export interface HealthRouteDependencies {
  checkDatabase: () => Promise<boolean>;
  getUptimeMs: () => number;
  logger: Logger;
}

export const healthRoute = (deps: HealthRouteDependencies) =>
  new Elysia({ name: "health-route" }).get(
    "/v1/health",
    async ({ set }) => {
      const requestId = String(
        set.headers["x-request-id"] ?? crypto.randomUUID(),
      );
      const dbIsHealthy = await deps.checkDatabase();

      deps.logger
        .child({ requestId, route: "/v1/health" })
        .info("Healthcheck completed.", {
          db: dbIsHealthy ? "up" : "down",
        });

      return {
        status: dbIsHealthy ? "ok" : "degraded",
        uptimeMs: deps.getUptimeMs(),
        db: dbIsHealthy ? "up" : "down",
      };
    },
    {
      response: {
        200: healthResponseSchema,
      },
    },
  );
