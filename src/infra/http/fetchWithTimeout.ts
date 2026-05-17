import {
  type ProviderError,
  ProviderHttpError,
  ProviderTimeoutError,
  ProviderTransportError,
} from "../../domain/errors/ProviderErrors";
import { err, ok, type Result } from "../../shared/result/Result";

export interface FetchWithTimeoutOptions {
  provider: string;
  input: string | URL;
  init?: RequestInit;
  timeoutMs: number;
}

export const fetchWithTimeout = async ({
  provider,
  input,
  init,
  timeoutMs,
}: FetchWithTimeoutOptions): Promise<Result<Response, ProviderError>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      return err(new ProviderHttpError(provider, response.status));
    }

    return ok(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return err(new ProviderTimeoutError(provider));
    }

    return err(
      new ProviderTransportError(
        provider,
        `${provider} transport failed: ${error instanceof Error ? error.message : "unknown error"}.`,
      ),
    );
  } finally {
    clearTimeout(timeoutId);
  }
};
