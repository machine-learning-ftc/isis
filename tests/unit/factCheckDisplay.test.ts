import { describe, expect, it } from "bun:test";
import {
  buildFactCheckDisplay,
  toConfidencePercent,
} from "../../src/domain/display/factCheckDisplay";

describe("factCheckDisplay", () => {
  it("builds localized labels for display", () => {
    const display = buildFactCheckDisplay({
      id: "11111111-1111-1111-1111-111111111111",
      query: "test query",
      claim: "test claim",
      verdict: "true",
      confidence: 0.88,
      source: "fact_api",
      status: "found",
      publisher: "Aos Fatos",
      ratingLabel: "Verdadeiro",
      url: "https://example.com",
      createdAt: new Date("2026-04-22T12:00:00.000Z"),
    });

    expect(display.verdictLabel).toBe("Verdadeiro");
    expect(display.sourceLabel).toBe("Fact-check (Google)");
    expect(display.statusLabel).toBe("Verificado na API");
    expect(display.confidencePercent).toBe(88);
    expect(display.publisher).toBe("Aos Fatos");
  });

  it("rounds confidence percent to one decimal", () => {
    expect(toConfidencePercent(0.9412)).toBe(94.1);
  });
});
