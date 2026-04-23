import type {
  FactProvider,
  ProviderCheck,
} from "../../application/ports/FactProvider";
import type { Logger } from "../../application/ports/Logger";
import {
  ProviderNoResultError,
  ProviderPayloadError,
} from "../../domain/errors/ProviderErrors";
import { normalizeVerdict } from "../../domain/value-objects/Verdict";
import { err, ok } from "../../shared/result/Result";
import type { MetricsRegistry } from "../metrics/registry";
import { fetchWithTimeout } from "./fetchWithTimeout";

interface GoogleFactCheckConfig {
  apiKey: string;
  metrics: MetricsRegistry;
  logger: Logger;
  timeoutMs: number;
  url: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const inferConfidence = (verdict: ProviderCheck["verdict"]): number => {
  if (verdict === "uncertain") {
    return 0.5;
  }

  return 0.9;
};

export const createGoogleFactCheckProvider = ({
  apiKey,
  logger,
  metrics,
  timeoutMs,
  url,
}: GoogleFactCheckConfig): FactProvider => ({
  async check(query) {
    const startedAt = performance.now();
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("query", query.toString());
    requestUrl.searchParams.set("key", apiKey);

    const response = await fetchWithTimeout({
      provider: "fact_api",
      input: requestUrl,
      timeoutMs,
    });

    if (!response.ok) {
      metrics.recordProviderCall(
        "fact_api",
        "error",
        performance.now() - startedAt,
      );
      return response;
    }

    try {
      const payload = (await response.value.json()) as unknown;

      if (!isRecord(payload)) {
        metrics.recordProviderCall(
          "fact_api",
          "error",
          performance.now() - startedAt,
        );
        return err(
          new ProviderPayloadError(
            "fact_api",
            "Fact API payload must be an object.",
          ),
        );
      }

      const claims = payload.claims;

      if (!Array.isArray(claims) || claims.length === 0) {
        metrics.recordProviderCall(
          "fact_api",
          "error",
          performance.now() - startedAt,
        );
        return err(new ProviderNoResultError("fact_api"));
      }

      const firstClaim = claims[0];

      if (!isRecord(firstClaim)) {
        metrics.recordProviderCall(
          "fact_api",
          "error",
          performance.now() - startedAt,
        );
        return err(
          new ProviderPayloadError(
            "fact_api",
            "Fact API claim entry is invalid.",
          ),
        );
      }

      const claimText = firstClaim.text;
      const claimReviews = firstClaim.claimReview;

      if (typeof claimText !== "string") {
        metrics.recordProviderCall(
          "fact_api",
          "error",
          performance.now() - startedAt,
        );
        return err(
          new ProviderPayloadError(
            "fact_api",
            "Fact API claim text is missing.",
          ),
        );
      }

      if (!Array.isArray(claimReviews) || claimReviews.length === 0) {
        metrics.recordProviderCall(
          "fact_api",
          "error",
          performance.now() - startedAt,
        );
        return err(new ProviderNoResultError("fact_api"));
      }

      const firstReview = claimReviews[0];

      if (
        !isRecord(firstReview) ||
        typeof firstReview.textualRating !== "string"
      ) {
        metrics.recordProviderCall(
          "fact_api",
          "error",
          performance.now() - startedAt,
        );
        return err(
          new ProviderPayloadError(
            "fact_api",
            "Fact API review rating is missing.",
          ),
        );
      }

      const verdict = normalizeVerdict(firstReview.textualRating);
      const result: ProviderCheck = {
        claim: claimText,
        verdict,
        confidence: inferConfidence(verdict),
        source: "fact_api",
        url: typeof firstReview.url === "string" ? firstReview.url : null,
      };

      metrics.recordProviderCall(
        "fact_api",
        "success",
        performance.now() - startedAt,
      );

      return ok(result);
    } catch (error) {
      logger.warn("Failed to parse fact-check provider payload.", {
        error: error instanceof Error ? error.message : "unknown_error",
      });
      metrics.recordProviderCall(
        "fact_api",
        "error",
        performance.now() - startedAt,
      );

      return err(
        new ProviderPayloadError(
          "fact_api",
          "Fact API payload could not be parsed safely.",
        ),
      );
    }
  },
});
