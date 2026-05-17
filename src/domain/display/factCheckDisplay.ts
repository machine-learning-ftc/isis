import type { Source } from "../../application/ports/FactProvider";
import type { Verdict } from "../value-objects/Verdict";

export type CheckStatus = "found" | "predicted";

export interface FactCheckDisplay {
  id: string;
  query: string;
  claim: string;
  verdict: Verdict;
  verdictLabel: string;
  confidence: number;
  confidencePercent: number;
  source: Source;
  sourceLabel: string;
  status: CheckStatus;
  statusLabel: string;
  publisher: string | null;
  ratingLabel: string | null;
  url: string | null;
  checkedAt: string;
  checkedAtBr: string;
}

const verdictLabels: Record<Verdict, string> = {
  true: "Verdadeiro",
  false: "Falso",
  uncertain: "Incerto",
};

const sourceLabels: Record<Source, string> = {
  fact_api: "Fact-check (Google)",
  ml: "Modelo de ML",
};

const statusLabels: Record<CheckStatus, string> = {
  found: "Verificado na API",
  predicted: "Estimado por ML",
};

const formatBrDateTime = (date: Date): string =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

export const toConfidencePercent = (confidence: number): number =>
  Math.round(confidence * 1000) / 10;

export const buildFactCheckDisplay = (input: {
  id: string;
  query: string;
  claim: string;
  verdict: Verdict;
  confidence: number;
  source: Source;
  status: CheckStatus;
  publisher: string | null;
  ratingLabel: string | null;
  url: string | null;
  createdAt: Date;
}): FactCheckDisplay => ({
  id: input.id,
  query: input.query,
  claim: input.claim,
  verdict: input.verdict,
  verdictLabel: verdictLabels[input.verdict],
  confidence: input.confidence,
  confidencePercent: toConfidencePercent(input.confidence),
  source: input.source,
  sourceLabel: sourceLabels[input.source],
  status: input.status,
  statusLabel: statusLabels[input.status],
  publisher: input.publisher,
  ratingLabel: input.ratingLabel,
  url: input.url,
  checkedAt: input.createdAt.toISOString(),
  checkedAtBr: formatBrDateTime(input.createdAt),
});
