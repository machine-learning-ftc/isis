import type { ProviderError } from "../../domain/errors/ProviderErrors";
import type { Query } from "../../domain/value-objects/Query";
import type { Verdict } from "../../domain/value-objects/Verdict";
import type { Result } from "../../shared/result/Result";

export type Source = "fact_api" | "ml";

export interface ProviderCheck {
  claim: string;
  verdict: Verdict;
  confidence: number;
  source: Source;
  url: string | null;
}

export interface FactProvider {
  check(query: Query): Promise<Result<ProviderCheck, ProviderError>>;
}
