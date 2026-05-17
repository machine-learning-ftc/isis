import type { Source } from "../../application/ports/FactProvider";
import type { CheckStatus } from "../display/factCheckDisplay";
import type { Verdict } from "../value-objects/Verdict";

export interface FactCheck {
  query: string;
  claim: string;
  verdict: Verdict;
  confidence: number;
  source: Source;
  status: CheckStatus;
  publisher: string | null;
  ratingLabel: string | null;
  url: string | null;
  providerPayload: Record<string, unknown> | null;
  createdAt: Date;
}
