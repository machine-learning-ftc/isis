import type { Source } from "../../application/ports/FactProvider";
import type { Verdict } from "../value-objects/Verdict";

export interface FactCheck {
  query: string;
  claim: string;
  verdict: Verdict;
  confidence: number;
  source: Source;
  url: string | null;
  createdAt: Date;
}
