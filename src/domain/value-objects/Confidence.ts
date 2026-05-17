import { err, ok, type Result } from "../../shared/result/Result";
import { ProviderPayloadError } from "../errors/ProviderErrors";

export class Confidence {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  public static from(
    input: unknown,
    provider: string,
  ): Result<Confidence, ProviderPayloadError> {
    if (typeof input !== "number" || !Number.isFinite(input)) {
      return err(
        new ProviderPayloadError(
          provider,
          `${provider} returned an invalid confidence.`,
        ),
      );
    }

    if (input < 0 || input > 1) {
      return err(
        new ProviderPayloadError(
          provider,
          `${provider} returned confidence outside the 0..1 range.`,
        ),
      );
    }

    return ok(new Confidence(input));
  }
}
