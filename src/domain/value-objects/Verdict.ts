export const VERDICTS = ["true", "false", "uncertain"] as const;

export type Verdict = (typeof VERDICTS)[number];

const trueRatings = new Set([
  "true",
  "mostly true",
  "correct",
  "accurate",
  "supported",
]);

const falseRatings = new Set([
  "false",
  "mostly false",
  "pants on fire",
  "incorrect",
  "misleading",
  "refuted",
]);

export const normalizeVerdict = (rating: string): Verdict => {
  const normalized = rating.trim().toLowerCase();

  if (trueRatings.has(normalized)) {
    return "true";
  }

  if (falseRatings.has(normalized)) {
    return "false";
  }

  return "uncertain";
};

export const isVerdict = (value: string): value is Verdict =>
  VERDICTS.includes(value as Verdict);
