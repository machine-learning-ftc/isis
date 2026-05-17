import { Elysia } from "elysia";
import {
  DomainError,
  InvalidInputError,
  ProvidersUnavailableError,
} from "../../domain/errors/DomainError";

const isDomainErrorWithCode = (
  value: unknown,
): value is DomainError & { code: string; message: string } =>
  value instanceof DomainError ||
  (typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof value.code === "string" &&
    typeof value.message === "string");

const unexpectedError = (requestId: string) => ({
  code: "internal_error",
  message: "An unexpected internal error occurred.",
  requestId,
});

export const errorMapperPlugin = new Elysia({ name: "error-mapper" }).onError(
  ({ code, error, set }) => {
    const requestId = String(
      set.headers["x-request-id"] ?? crypto.randomUUID(),
    );

    set.headers["x-request-id"] = requestId;

    if (code === "VALIDATION") {
      set.status = 400;

      return {
        code: "invalid_input",
        message: "Request payload is invalid.",
        requestId,
      };
    }

    if (error instanceof InvalidInputError) {
      set.status = 400;

      return {
        code: error.code,
        message: error.message,
        requestId,
      };
    }

    if (error instanceof ProvidersUnavailableError) {
      set.status = 503;

      return {
        code: error.code,
        message: error.message,
        requestId,
      };
    }

    if (isDomainErrorWithCode(error)) {
      set.status = 500;

      if (error.code === "providers_unavailable") {
        set.status = 503;
      }

      if (error.code === "invalid_input") {
        set.status = 400;
      }

      if (set.status !== 500) {
        return {
          code: error.code,
          message: error.message,
          requestId,
        };
      }

      return unexpectedError(requestId);
    }

    set.status = 500;

    return unexpectedError(requestId);
  },
);
