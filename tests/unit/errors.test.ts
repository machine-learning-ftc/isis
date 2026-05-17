import { describe, expect, it } from "bun:test";
import {
  InvalidInputError,
  ProvidersUnavailableError,
} from "../../src/domain/errors/DomainError";
import { PersistenceError } from "../../src/domain/errors/PersistenceError";
import {
  ProviderHttpError,
  ProviderNoResultError,
  ProviderPayloadError,
  ProviderTimeoutError,
  ProviderTransportError,
} from "../../src/domain/errors/ProviderErrors";
import { isVerdict } from "../../src/domain/value-objects/Verdict";

describe("domain errors", () => {
  it("creates invalid input errors with the expected code", () => {
    const error = new InvalidInputError("bad request");

    expect(error.code).toBe("invalid_input");
    expect(error.message).toBe("bad request");
  });

  it("creates providers unavailable errors with the expected code", () => {
    const error = new ProvidersUnavailableError();

    expect(error.code).toBe("providers_unavailable");
  });

  it("creates persistence errors with the expected code", () => {
    const error = new PersistenceError("write failed");

    expect(error.code).toBe("persistence_error");
  });

  it("creates provider-specific errors with metadata", () => {
    const timeout = new ProviderTimeoutError("fact_api");
    const http = new ProviderHttpError("fact_api", 429);
    const transport = new ProviderTransportError("ml", "network down");
    const payload = new ProviderPayloadError("ml", "bad payload");
    const noResult = new ProviderNoResultError("ml");

    expect(timeout.provider).toBe("fact_api");
    expect(http.status).toBe(429);
    expect(transport.code).toBe("provider_transport_error");
    expect(payload.code).toBe("provider_payload_error");
    expect(noResult.code).toBe("provider_no_result");
  });
});

describe("isVerdict", () => {
  it("recognizes valid verdict literals", () => {
    expect(isVerdict("true")).toBe(true);
    expect(isVerdict("false")).toBe(true);
    expect(isVerdict("uncertain")).toBe(true);
  });

  it("rejects invalid verdict literals", () => {
    expect(isVerdict("mixed")).toBe(false);
  });
});
