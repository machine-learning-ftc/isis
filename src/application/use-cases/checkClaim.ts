import {
  buildFactCheckDisplay,
  type FactCheckDisplay,
} from "../../domain/display/factCheckDisplay";
import type { FactCheck } from "../../domain/entities/FactCheck";
import {
  type InvalidInputError,
  ProvidersUnavailableError,
} from "../../domain/errors/DomainError";
import type { PersistenceError } from "../../domain/errors/PersistenceError";
import type { ProviderError } from "../../domain/errors/ProviderErrors";
import { Query } from "../../domain/value-objects/Query";
import { err, ok, type Result } from "../../shared/result/Result";
import type { Clock } from "../ports/Clock";
import type { FactCheckRepository } from "../ports/FactCheckRepository";
import type { FactProvider, ProviderCheck } from "../ports/FactProvider";
import type { Logger } from "../ports/Logger";
import type { MLProvider } from "../ports/MLProvider";

export interface CheckClaimCommand {
  query: string;
}

export interface CheckClaimResponse {
  id: string | null;
  status: "found" | "predicted";
  data: {
    verdict: ProviderCheck["verdict"];
    confidence: number;
    source: ProviderCheck["source"];
    url: string | null;
  };
  display: FactCheckDisplay;
}

export type CheckClaimError = InvalidInputError | ProvidersUnavailableError;

export interface CheckClaimDependencies {
  factProvider: FactProvider;
  mlProvider: MLProvider;
  repository: FactCheckRepository;
  clock: Clock;
  logger: Logger;
}

const buildFactCheck = (
  query: Query,
  check: ProviderCheck,
  clock: Clock,
): FactCheck => ({
  query: query.toString(),
  claim: check.claim,
  verdict: check.verdict,
  confidence: check.confidence,
  source: check.source,
  status: check.source === "fact_api" ? "found" : "predicted",
  publisher: check.publisher,
  ratingLabel: check.ratingLabel,
  url: check.url,
  providerPayload: check.providerPayload ?? null,
  createdAt: clock.now(),
});

const persistSafely = async (
  repository: FactCheckRepository,
  logger: Logger,
  factCheck: FactCheck,
): Promise<Result<string, PersistenceError>> => {
  const result = await repository.save(factCheck);

  if (!result.ok) {
    logger.error("Failed to persist fact check.", {
      errorCode: result.error.code,
      query: factCheck.query,
      source: factCheck.source,
    });
  }

  return result;
};

const toResponse = (
  check: ProviderCheck,
  query: Query,
  clock: Clock,
  id: string | null,
): CheckClaimResponse => {
  const status = check.source === "fact_api" ? "found" : "predicted";
  const createdAt = clock.now();

  const display = buildFactCheckDisplay({
    id: id ?? "00000000-0000-0000-0000-000000000000",
    query: query.toString(),
    claim: check.claim,
    verdict: check.verdict,
    confidence: check.confidence,
    source: check.source,
    status,
    publisher: check.publisher,
    ratingLabel: check.ratingLabel,
    url: check.url,
    createdAt,
  });

  if (id) {
    return {
      id,
      status,
      data: {
        verdict: check.verdict,
        confidence: check.confidence,
        source: check.source,
        url: check.url,
      },
      display: { ...display, id },
    };
  }

  return {
    id: null,
    status,
    data: {
      verdict: check.verdict,
      confidence: check.confidence,
      source: check.source,
      url: check.url,
    },
    display,
  };
};

export const checkClaim = async (
  deps: CheckClaimDependencies,
  command: CheckClaimCommand,
): Promise<Result<CheckClaimResponse, CheckClaimError>> => {
  const queryResult = Query.create(command.query);

  if (!queryResult.ok) {
    return err(queryResult.error);
  }

  const query = queryResult.value;
  const primaryResult = await deps.factProvider.check(query);

  if (primaryResult.ok) {
    const factCheck = buildFactCheck(query, primaryResult.value, deps.clock);
    const persistResult = await persistSafely(
      deps.repository,
      deps.logger,
      factCheck,
    );

    return ok(
      toResponse(
        primaryResult.value,
        query,
        deps.clock,
        persistResult.ok ? persistResult.value : null,
      ),
    );
  }

  deps.logger.warn("Primary provider failed, falling back to ML provider.", {
    errorCode: primaryResult.error.code,
    provider: primaryResult.error.provider,
  });

  const fallbackResult = await deps.mlProvider.predict(query);

  if (fallbackResult.ok) {
    const factCheck = buildFactCheck(query, fallbackResult.value, deps.clock);
    const persistResult = await persistSafely(
      deps.repository,
      deps.logger,
      factCheck,
    );

    return ok(
      toResponse(
        fallbackResult.value,
        query,
        deps.clock,
        persistResult.ok ? persistResult.value : null,
      ),
    );
  }

  deps.logger.error("All providers failed to verify the claim.", {
    primaryErrorCode: primaryResult.error.code,
    fallbackErrorCode: fallbackResult.error.code,
  });

  return err(new ProvidersUnavailableError());
};

export type ProviderFailure = ProviderError;
