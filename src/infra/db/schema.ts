import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const factChecks = pgTable(
  "fact_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    query: text("query").notNull(),
    claim: text("claim").notNull(),
    verdict: varchar("verdict", { length: 16 }).notNull(),
    confidence: doublePrecision("confidence").notNull(),
    source: varchar("source", { length: 16 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    publisher: text("publisher"),
    ratingLabel: text("rating_label"),
    url: text("url"),
    providerPayload: jsonb("provider_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idxCreatedAt: index("idx_fact_checks_created_at").on(table.createdAt),
    idxQuery: index("idx_fact_checks_query").on(table.query),
    idxSource: index("idx_fact_checks_source").on(table.source),
    idxStatus: index("idx_fact_checks_status").on(table.status),
    verdictCheck: check(
      "fact_checks_verdict_check",
      sql`${table.verdict} IN ('true', 'false', 'uncertain')`,
    ),
    sourceCheck: check(
      "fact_checks_source_check",
      sql`${table.source} IN ('fact_api', 'ml')`,
    ),
    statusCheck: check(
      "fact_checks_status_check",
      sql`${table.status} IN ('found', 'predicted')`,
    ),
    confidenceRange: check(
      "fact_checks_confidence_range",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
  }),
);
