import { describe, expect, it } from "bun:test";
import { loadEnv } from "../../src/infra/config/env";

describe("loadEnv", () => {
  it("allows an empty ML_SERVICE_API_KEY", () => {
    const env = loadEnv({
      ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/factcheck",
      FACT_CHECK_API_URL:
        "https://factchecktools.googleapis.com/v1alpha1/claims:search",
      FACT_CHECK_API_KEY: "test-key",
      ML_SERVICE_URL: "http://localhost:5001/predict",
      ML_SERVICE_API_KEY: "",
    });

    expect(env.ML_SERVICE_API_KEY).toBeUndefined();
  });

  it("defaults FACT_CHECK_LANGUAGE_CODE to pt-BR", () => {
    const env = loadEnv({
      ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/factcheck",
      FACT_CHECK_API_URL:
        "https://factchecktools.googleapis.com/v1alpha1/claims:search",
      FACT_CHECK_API_KEY: "test-key",
      ML_SERVICE_URL: "http://localhost:5001/predict",
    });

    expect(env.FACT_CHECK_LANGUAGE_CODE).toBe("pt-BR");
  });
});
