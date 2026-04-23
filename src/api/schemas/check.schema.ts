import { t } from "elysia";

export const checkRequestSchema = t.Object({
  query: t.String({
    minLength: 1,
    maxLength: 2048,
  }),
});

export const checkResponseSchema = t.Object({
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
