import { sql } from "drizzle-orm";
import type { FactCheckRepository } from "../../application/ports/FactCheckRepository";
import type { Source } from "../../application/ports/FactProvider";
import type { FactCheckDisplay } from "../../domain/display/factCheckDisplay";
import { PersistenceError } from "../../domain/errors/PersistenceError";
import { isVerdict } from "../../domain/value-objects/Verdict";
import { err, ok } from "../../shared/result/Result";
import type { DatabaseClient } from "./client";
import { factChecks } from "./schema";

type DisplayRow = Record<string, unknown> & {
  id: string;
  query: string;
  claim: string;
  verdict: string;
  verdict_label: string;
  confidence: number;
  confidence_percent: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  publisher: string | null;
  rating_label: string | null;
  url: string | null;
  checked_at_iso: string;
  checked_at_br: string;
};

const mapDisplayRow = (row: DisplayRow): FactCheckDisplay => {
  const verdict = isVerdict(row.verdict) ? row.verdict : "uncertain";
  const source: Source = row.source === "ml" ? "ml" : "fact_api";
  const status = row.status === "predicted" ? "predicted" : "found";

  return {
    id: row.id,
    query: row.query,
    claim: row.claim,
    verdict,
    verdictLabel: row.verdict_label,
    confidence: row.confidence,
    confidencePercent: Number(row.confidence_percent),
    source,
    sourceLabel: row.source_label,
    status,
    statusLabel: row.status_label,
    publisher: row.publisher,
    ratingLabel: row.rating_label,
    url: row.url,
    checkedAt: row.checked_at_iso.endsWith("Z")
      ? row.checked_at_iso
      : `${row.checked_at_iso}Z`,
    checkedAtBr: row.checked_at_br,
  };
};

export const createFactCheckRepository = (
  client: DatabaseClient,
): FactCheckRepository => ({
  async save(factCheck) {
    try {
      const [inserted] = await client.db
        .insert(factChecks)
        .values({
          query: factCheck.query,
          claim: factCheck.claim,
          verdict: factCheck.verdict,
          confidence: factCheck.confidence,
          source: factCheck.source,
          status: factCheck.status,
          publisher: factCheck.publisher,
          ratingLabel: factCheck.ratingLabel,
          url: factCheck.url,
          providerPayload: factCheck.providerPayload,
          createdAt: factCheck.createdAt,
        })
        .returning({ id: factChecks.id });

      if (!inserted) {
        return err(new PersistenceError("Insert did not return an id."));
      }

      return ok(inserted.id);
    } catch (error) {
      return err(
        new PersistenceError(
          `Failed to persist fact check: ${error instanceof Error ? error.message : "unknown error"}.`,
        ),
      );
    }
  },

  async findDisplayById(id) {
    try {
      const result = await client.db.execute(sql`
        SELECT
          id,
          query,
          claim,
          verdict,
          verdict_label,
          confidence,
          confidence_percent,
          source,
          source_label,
          status,
          status_label,
          publisher,
          rating_label,
          url,
          checked_at_iso,
          checked_at_br
        FROM v_fact_checks_display
        WHERE id = ${id}::uuid
        LIMIT 1
      `);

      const row = result.rows[0] as DisplayRow | undefined;

      if (!row) {
        return ok(null);
      }

      return ok(mapDisplayRow(row));
    } catch (error) {
      return err(
        new PersistenceError(
          `Failed to load fact check display: ${error instanceof Error ? error.message : "unknown error"}.`,
        ),
      );
    }
  },
});
