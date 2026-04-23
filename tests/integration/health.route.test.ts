import { describe, expect, it } from "bun:test";
import type { Clock } from "../../src/application/ports/Clock";
import type { LogContext, Logger } from "../../src/application/ports/Logger";
import { ProviderNoResultError } from "../../src/domain/errors/ProviderErrors";
import { createMetricsRegistry } from "../../src/infra/metrics/registry";
import { createServer } from "../../src/server";
import { err, ok } from "../../src/shared/result/Result";

class FakeLogger implements Logger {
  public child(_bindings: LogContext): Logger {
    return this;
  }

  public info(_message: string, _context?: LogContext): void {}

  public warn(_message: string, _context?: LogContext): void {}

  public error(_message: string, _context?: LogContext): void {}
}

const clock: Clock = {
  now: () => new Date("2026-04-22T00:00:00.000Z"),
};

describe("GET /v1/health", () => {
  it("returns service liveness and readiness summary", async () => {
    const app = createServer({
      factProvider: {
        check: async () => err(new ProviderNoResultError("fact_api")),
      },
      mlProvider: {
        predict: async () => err(new ProviderNoResultError("ml")),
      },
      repository: {
        save: async () => ok(undefined),
      },
      clock,
      logger: new FakeLogger(),
      metrics: createMetricsRegistry(),
      checkDatabase: async () => true,
      getUptimeMs: () => 321,
    });

    const response = await app.handle(
      new Request("http://localhost/v1/health"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      uptimeMs: 321,
      db: "up",
    });
  });
});
