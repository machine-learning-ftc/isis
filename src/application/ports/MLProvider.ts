import type { ProviderError } from "../../domain/errors/ProviderErrors";
import type { Query } from "../../domain/value-objects/Query";
import type { Result } from "../../shared/result/Result";
import type { ProviderCheck } from "./FactProvider";

export interface MLProvider {
  predict(query: Query): Promise<Result<ProviderCheck, ProviderError>>;
}
