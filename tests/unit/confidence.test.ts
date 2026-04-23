import { describe, expect, it } from "bun:test";
import { Confidence } from "../../src/domain/value-objects/Confidence";

describe("Confidence.from", () => {
  it("accepts values inside the 0..1 range", () => {
    const result = Confidence.from(0.82, "ml");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe(0.82);
    }
  });

  it("rejects non-finite values", () => {
    const result = Confidence.from(Number.NaN, "ml");

    expect(result.ok).toBe(false);
  });

  it("rejects values outside the allowed range", () => {
    const result = Confidence.from(1.4, "ml");

    expect(result.ok).toBe(false);
  });
});
