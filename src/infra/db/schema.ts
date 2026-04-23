import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
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
    url: text("url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idxCreatedAt: index("idx_fact_checks_created_at").on(table.createdAt),
    idxQuery: index("idx_fact_checks_query").on(table.query),
    confidenceRange: check(
      "confidence_range",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
  }),
);
