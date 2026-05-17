import type { FactCheckDisplay } from "../../domain/display/factCheckDisplay";
import type { FactCheck } from "../../domain/entities/FactCheck";
import type { PersistenceError } from "../../domain/errors/PersistenceError";
import type { Result } from "../../shared/result/Result";

export interface FactCheckRepository {
  save(factCheck: FactCheck): Promise<Result<string, PersistenceError>>;
  findDisplayById(
    id: string,
  ): Promise<Result<FactCheckDisplay | null, PersistenceError>>;
}
