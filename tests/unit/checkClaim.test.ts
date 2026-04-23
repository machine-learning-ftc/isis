import { describe, expect, it } from "bun:test";
import type { Clock } from "../../src/application/ports/Clock";
import type { FactCheckRepository } from "../../src/application/ports/FactCheckRepository";
import type {
  FactProvider,
  ProviderCheck,
} from "../../src/application/ports/FactProvider";
import type { LogContext, Logger } from "../../src/application/ports/Logger";
import type { MLProvider } from "../../src/application/ports/MLProvider";
import { checkClaim } from "../../src/application/use-cases/checkClaim";
import { PersistenceError } from "../../src/domain/errors/PersistenceError";
import { ProviderNoResultError } from "../../src/domain/errors/ProviderErrors";
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

const buildDependencies = ({
  factProvider,
  mlProvider,
  repository,
}: {
  factProvider: FactProvider;
  mlProvider: MLProvider;
  repository: FactCheckRepository;
}) => ({
  factProvider,
  mlProvider,
  repository,
  clock,
  logger: new FakeLogger(),
});

const primaryCheck: ProviderCheck = {
  claim: "Water boils at 100C at sea level.",
  verdict: "true",
  confidence: 0.9,
  source: "fact_api",
  url: "https://example.com/fact",
};

const mlCheck: ProviderCheck = {
  claim: "The moon is made of cheese.",
  verdict: "false",
  confidence: 0.96,
  source: "ml",
  url: null,
};

describe("checkClaim", () => {
  it("returns the primary provider result when available", async () => {
    const result = await checkClaim(
      buildDependencies({
        factProvider: {
          check: async () => ok(primaryCheck),
        },
        mlProvider: {
          predict: async () => ok(mlCheck),
        },
        repository: {
          save: async () => ok(undefined),
        },
      }),
      { query: "Water boils at 100C at sea level" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("found");
      expect(result.value.data.source).toBe("fact_api");
    }
  });

  it("falls back to the ML provider when the primary provider has no usable result", async () => {
    const result = await checkClaim(
      buildDependencies({
        factProvider: {
          check: async () => err(new ProviderNoResultError("fact_api")),
        },
        mlProvider: {
          predict: async () => ok(mlCheck),
        },
        repository: {
          save: async () => ok(undefined),
        },
      }),
      { query: "The moon is made of cheese" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("predicted");
      expect(result.value.data.source).toBe("ml");
    }
  });

  it("returns providers_unavailable when both providers fail", async () => {
    const result = await checkClaim(
      buildDependencies({
        factProvider: {
          check: async () => err(new ProviderNoResultError("fact_api")),
        },
        mlProvider: {
          predict: async () => err(new ProviderNoResultError("ml")),
        },
        repository: {
          save: async () => ok(undefined),
        },
      }),
      { query: "Unknown claim" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("providers_unavailable");
    }
  });

  it("does not fail the response when persistence fails", async () => {
    const result = await checkClaim(
      buildDependencies({
        factProvider: {
          check: async () => ok(primaryCheck),
        },
        mlProvider: {
          predict: async () => ok(mlCheck),
        },
        repository: {
          save: async () => err(new PersistenceError("db unavailable")),
        },
      }),
      { query: "Water boils at 100C at sea level" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.data.verdict).toBe("true");
    }
  });
});
