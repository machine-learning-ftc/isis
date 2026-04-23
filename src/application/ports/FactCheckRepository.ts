import type { FactCheck } from "../../domain/entities/FactCheck";
import type { PersistenceError } from "../../domain/errors/PersistenceError";
import type { Result } from "../../shared/result/Result";

export interface FactCheckRepository {
  save(factCheck: FactCheck): Promise<Result<void, PersistenceError>>;
}
