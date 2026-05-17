import { Elysia, t } from "elysia";
import type { FactCheckRepository } from "../../application/ports/FactCheckRepository";
import { factCheckDisplaySchema } from "../schemas/check.schema";
import { apiErrorSchema } from "../schemas/error.schema";

export interface ChecksRouteDependencies {
  repository: FactCheckRepository;
}

export const checksRoute = (deps: ChecksRouteDependencies) =>
  new Elysia({ name: "checks-route" }).get(
    "/v1/checks/:id",
    async ({ params, set }) => {
      const result = await deps.repository.findDisplayById(params.id);

      if (!result.ok) {
        set.status = 500;
        throw result.error;
      }

      if (!result.value) {
        set.status = 404;

        return {
          code: "not_found",
          message: "Fact check not found.",
          requestId: String(set.headers["x-request-id"] ?? ""),
        };
      }

      return result.value;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      response: {
        200: factCheckDisplaySchema,
        404: apiErrorSchema,
        500: apiErrorSchema,
      },
    },
  );
