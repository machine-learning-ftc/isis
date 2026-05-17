import { err, ok, type Result } from "../../shared/result/Result";
import type { Brand } from "../../shared/types/brand";
import { InvalidInputError } from "../errors/DomainError";

export const MAX_QUERY_LENGTH = 2048;

export type QueryValue = Brand<string, "QueryValue">;

export class Query {
  public readonly value: QueryValue;

  private constructor(value: QueryValue) {
    this.value = value;
  }

  public static create(raw: string): Result<Query, InvalidInputError> {
    const value = raw.trim();

    if (value.length === 0) {
      return err(new InvalidInputError("Query cannot be empty."));
    }

    if (value.length > MAX_QUERY_LENGTH) {
      return err(
        new InvalidInputError(
          `Query must be at most ${MAX_QUERY_LENGTH} characters long.`,
        ),
      );
    }

    return ok(new Query(value as QueryValue));
  }

  public toString(): string {
    return this.value;
  }
}
