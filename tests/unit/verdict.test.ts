import { describe, expect, it } from "bun:test";
import { normalizeVerdict } from "../../src/domain/value-objects/Verdict";

describe("normalizeVerdict", () => {
  it("maps true-like ratings to true", () => {
    expect(normalizeVerdict("Mostly True")).toBe("true");
  });

  it("maps false-like ratings to false", () => {
    expect(normalizeVerdict("Pants on Fire")).toBe("false");
  });

  it("defaults unknown ratings to uncertain", () => {
    expect(normalizeVerdict("Mixed")).toBe("uncertain");
  });
});
