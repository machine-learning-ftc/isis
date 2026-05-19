import { describe, expect, it } from "bun:test";
import type { Clock } from "../../src/application/ports/Clock";
import type { FactCheckRepository } from "../../src/application/ports/FactCheckRepository";
import type {
  FactProvider,
  ProviderCheck,
} from "../../src/application/ports/FactProvider";
import type { LogContext, Logger } from "../../src/application/ports/Logger";
import type { MLProvider } from "../../src/application/ports/MLProvider";
import { ProviderNoResultError } from "../../src/domain/errors/ProviderErrors";
import { createMetricsRegistry } from "../../src/infra/metrics/registry";
import { createServer } from "../../src/server";
import { err, ok } from "../../src/shared/result/Result";

const SAVED_ID = "11111111-1111-1111-1111-111111111111";

class FakeLogger implements Logger {
  public child(_bindings: LogContext): Logger {
    return this;
  }

  public info(_message: string, _context?: LogContext): void { }

  public warn(_message: string, _context?: LogContext): void { }

  public error(_message: string, _context?: LogContext): void { }
}

const clock: Clock = {
  now: () => new Date("2026-04-22T00:00:00.000Z"),
};

const primaryCheck: ProviderCheck = {
  claim: "A real fact",
  verdict: "true",
  confidence: 0.88,
  source: "fact_api",
  url: "https://example.com/fact",
  publisher: "Aos Fatos",
  ratingLabel: "True",
  providerPayload: null,
};

const mlCheck: ProviderCheck = {
  claim: "Fallback prediction",
  verdict: "uncertain",
  confidence: 0.62,
  source: "ml",
  url: null,
  publisher: null,
  ratingLabel: null,
  providerPayload: null,
};

const fakeRepository: FactCheckRepository = {
  save: async () => ok(SAVED_ID),
  findDisplayById: async () => ok(null),
};

const buildServer = ({
  factProvider,
  mlProvider,
}: {
  factProvider: FactProvider;
  mlProvider: MLProvider;
}) =>
  createServer({
    factProvider,
    mlProvider,
    repository: fakeRepository,
    clock,
    logger: new FakeLogger(),
    metrics: createMetricsRegistry(),
    checkDatabase: async () => true,
    getUptimeMs: () => 123,
  });

describe("POST /v1/check", () => {
  it("returns success via the primary provider", async () => {
    const app = buildServer({
      factProvider: {
        check: async () => ok(primaryCheck),
      },
      mlProvider: {
        predict: async () => ok(mlCheck),
      },
    });

    const response = await app.handle(
      new Request("http://localhost/v1/check", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: "A real fact",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeString();

    const body = (await response.json()) as {
      id: string;
      status: string;
      data: {
        verdict: string;
        confidence: number;
        source: string;
        url: string;
      };
    };
    expect(body.id).toBe(SAVED_ID);
    expect(body.status).toBe("found");
    expect(body.data).toEqual({
      verdict: "true",
      confidence: 0.88,
      source: "fact_api",
      url: "https://example.com/fact",
    });
  });

  it("returns success via the fallback provider", async () => {
    const app = buildServer({
      factProvider: {
        check: async () => err(new ProviderNoResultError("fact_api")),
      },
      mlProvider: {
        predict: async () => ok(mlCheck),
      },
    });

    const response = await app.handle(
      new Request("http://localhost/v1/check", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: "Fallback prediction",
        }),
      }),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: string;
      data: { source: string };
    };
    expect(body.status).toBe("predicted");
    expect(body.data.source).toBe("ml");
  });

  it("returns 503 when both providers fail", async () => {
    const app = buildServer({
      factProvider: {
        check: async () => err(new ProviderNoResultError("fact_api")),
      },
      mlProvider: {
        predict: async () => err(new ProviderNoResultError("ml")),
      },
    });

    const response = await app.handle(
      new Request("http://localhost/v1/check", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: "Unknown claim",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "providers_unavailable",
      requestId: expect.any(String),
    });
  });
});
