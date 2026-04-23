import { describe, expect, it } from "bun:test";
import { MAX_QUERY_LENGTH, Query } from "../../src/domain/value-objects/Query";

describe("Query.create", () => {
  it("trims and accepts valid queries", () => {
    const result = Query.create("  climate change  ");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.toString()).toBe("climate change");
    }
  });

  it("rejects empty queries", () => {
    const result = Query.create("   ");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_input");
    }
  });

  it("rejects queries above the max length", () => {
    const result = Query.create("x".repeat(MAX_QUERY_LENGTH + 1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(MAX_QUERY_LENGTH.toString());
    }
  });
});
