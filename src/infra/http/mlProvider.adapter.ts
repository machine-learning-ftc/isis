import type { ProviderCheck } from "../../application/ports/FactProvider";
import type { Logger } from "../../application/ports/Logger";
import type { MLProvider } from "../../application/ports/MLProvider";
import { ProviderPayloadError } from "../../domain/errors/ProviderErrors";
import { Confidence } from "../../domain/value-objects/Confidence";
import {
  isVerdict,
  normalizeVerdict,
} from "../../domain/value-objects/Verdict";
import { err, ok } from "../../shared/result/Result";
import type { MetricsRegistry } from "../metrics/registry";
import { fetchWithTimeout } from "./fetchWithTimeout";

interface MlProviderConfig {
  apiKey: string;
  logger: Logger;
  metrics: MetricsRegistry;
  timeoutMs: number;
  url: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const createMlProvider = ({
  apiKey,
  logger,
  metrics,
  timeoutMs,
  url,
}: MlProviderConfig): MLProvider => ({
  async predict(query) {
    const startedAt = performance.now();
    const response = await fetchWithTimeout({
      provider: "ml",
      input: url,
      timeoutMs,
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          query: query.toString(),
        }),
      },
    });

    if (!response.ok) {
      metrics.recordProviderCall("ml", "error", performance.now() - startedAt);
      return response;
    }

    try {
      const payload = (await response.value.json()) as unknown;

      if (!isRecord(payload)) {
        metrics.recordProviderCall(
          "ml",
          "error",
          performance.now() - startedAt,
        );
        return err(
          new ProviderPayloadError("ml", "ML payload must be an object."),
        );
      }

      const verdictValue = payload.verdict;
      const confidenceResult = Confidence.from(payload.confidence, "ml");

      if (typeof verdictValue !== "string") {
        metrics.recordProviderCall(
          "ml",
          "error",
          performance.now() - startedAt,
        );
        return err(new ProviderPayloadError("ml", "ML verdict is missing."));
      }

      if (!confidenceResult.ok) {
        metrics.recordProviderCall(
          "ml",
          "error",
          performance.now() - startedAt,
        );
        return confidenceResult;
      }

      const verdict = isVerdict(verdictValue)
        ? verdictValue
        : normalizeVerdict(verdictValue);

      const result: ProviderCheck = {
        claim:
          typeof payload.claim === "string" ? payload.claim : query.toString(),
        verdict,
        confidence: confidenceResult.value.value,
        source: "ml",
        url: typeof payload.url === "string" ? payload.url : null,
      };

      metrics.recordProviderCall(
        "ml",
        "success",
        performance.now() - startedAt,
      );

      return ok(result);
    } catch (error) {
      logger.warn("Failed to parse ML provider payload.", {
        error: error instanceof Error ? error.message : "unknown_error",
      });
      metrics.recordProviderCall("ml", "error", performance.now() - startedAt);

      return err(
        new ProviderPayloadError(
          "ml",
          "ML payload could not be parsed safely.",
        ),
      );
    }
  },
});
