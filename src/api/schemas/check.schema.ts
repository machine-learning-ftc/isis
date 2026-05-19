import { t } from "elysia";

export const factCheckDisplaySchema = t.Object({
  id: t.String({ format: "uuid" }),
  query: t.String(),
  claim: t.String(),
  verdict: t.Union([
    t.Literal("true"),
    t.Literal("false"),
    t.Literal("uncertain"),
  ]),
  verdictLabel: t.String(),
  confidence: t.Number({ minimum: 0, maximum: 1 }),
  confidencePercent: t.Number({ minimum: 0, maximum: 100 }),
  source: t.Union([t.Literal("fact_api"), t.Literal("ml")]),
  sourceLabel: t.String(),
  status: t.Union([t.Literal("found"), t.Literal("predicted")]),
  statusLabel: t.String(),
  publisher: t.Nullable(t.String()),
  ratingLabel: t.Nullable(t.String()),
  url: t.Nullable(t.String()),
  checkedAt: t.String(),
  checkedAtBr: t.String(),
});

export const checkRequestSchema = t.Object({
  query: t.String({
    minLength: 1,
    maxLength: 2048,
  }),
});

export const checkResponseSchema = t.Object({
  id: t.Nullable(t.String({ format: "uuid" })),
  status: t.Union([t.Literal("found"), t.Literal("predicted")]),
  data: t.Object({
    verdict: t.Union([
      t.Literal("true"),
      t.Literal("false"),
      t.Literal("uncertain"),
    ]),
    confidence: t.Number({
      minimum: 0,
      maximum: 1,
    }),
    source: t.Union([t.Literal("fact_api"), t.Literal("ml")]),
    url: t.Nullable(t.String()),
  }),
});
