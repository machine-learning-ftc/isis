import type { FactCheckRepository } from "../../application/ports/FactCheckRepository";
import { PersistenceError } from "../../domain/errors/PersistenceError";
import { err, ok } from "../../shared/result/Result";
import type { DatabaseClient } from "./client";
import { factChecks } from "./schema";

export const createFactCheckRepository = (
  client: DatabaseClient,
): FactCheckRepository => ({
  async save(factCheck) {
    try {
      await client.db.insert(factChecks).values({
        query: factCheck.query,
        claim: factCheck.claim,
        verdict: factCheck.verdict,
        confidence: factCheck.confidence,
        source: factCheck.source,
        url: factCheck.url,
        createdAt: factCheck.createdAt,
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new PersistenceError(
          `Failed to persist fact check: ${error instanceof Error ? error.message : "unknown error"}.`,
        ),
      );
    }
  },
});
