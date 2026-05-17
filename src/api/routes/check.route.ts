import { Elysia } from "elysia";
import type { CheckClaimDependencies } from "../../application/use-cases/checkClaim";
import { checkClaim } from "../../application/use-cases/checkClaim";
import type { MetricsRegistry } from "../../infra/metrics/registry";
import {
  checkRequestSchema,
  checkResponseSchema,
} from "../schemas/check.schema";
import { apiErrorSchema } from "../schemas/error.schema";

export interface CheckRouteDependencies extends CheckClaimDependencies {
  metrics: MetricsRegistry;
}

export const checkRoute = (deps: CheckRouteDependencies) =>
  new Elysia({ name: "check-route" }).post(
    "/v1/check",
    async ({ body, set }) => {
      const requestId = String(
        set.headers["x-request-id"] ?? crypto.randomUUID(),
      );

      const logger = deps.logger.child({
        requestId,
        route: "/v1/check",
      });

      const result = await checkClaim(
        {
          ...deps,
          logger,
        },
        body,
      );

      if (!result.ok) {
        set.status = result.error.code === "providers_unavailable" ? 503 : 400;

        return {
          code: result.error.code,
          message: result.error.message,
          requestId,
        };
      }

      if (result.value.status === "predicted") {
        deps.metrics.incrementFallback();
      }

      logger.info("Claim verified successfully.", {
        source: result.value.data.source,
        verdict: result.value.data.verdict,
      });

      return result.value;
    },
    {
      body: checkRequestSchema,
      response: {
        200: checkResponseSchema,
        400: apiErrorSchema,
        500: apiErrorSchema,
        503: apiErrorSchema,
      },
    },
  );
