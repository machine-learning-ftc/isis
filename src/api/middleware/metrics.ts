import { Elysia } from "elysia";
import type { MetricsRegistry } from "../../infra/metrics/registry";

const toStatusCode = (status: unknown): number => {
  if (typeof status === "number") {
    return status;
  }

  if (typeof status === "string") {
    const parsed = Number(status);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 200;
};

export const metricsPlugin = (metrics: MetricsRegistry) => {
  const startedAtByRequest = new WeakMap<Request, number>();
  const finalizedRequests = new WeakSet<Request>();

  const finalize = (request: Request, status: unknown) => {
    if (finalizedRequests.has(request)) {
      return;
    }

    finalizedRequests.add(request);
    const startedAt = startedAtByRequest.get(request);

    if (startedAt === undefined) {
      return;
    }

    metrics.recordHttpRequest(
      new URL(request.url).pathname,
      request.method,
      toStatusCode(status),
      performance.now() - startedAt,
    );
  };

  return new Elysia({ name: "metrics" })
    .onRequest(({ request }) => {
      startedAtByRequest.set(request, performance.now());
    })
    .onAfterHandle(({ request, set }) => {
      finalize(request, set.status);
    })
    .onError(({ request, set }) => {
      finalize(request, set.status);
    });
};
