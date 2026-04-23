import { DomainError } from "./DomainError";

export class ProviderError extends DomainError {
  public readonly provider: string;

  protected constructor(provider: string, code: string, message: string) {
    super(code, message);
    this.provider = provider;
  }
}

export class ProviderTimeoutError extends ProviderError {
  public constructor(provider: string) {
    super(provider, "provider_timeout", `${provider} timed out.`);
  }
}

export class ProviderHttpError extends ProviderError {
  public readonly status: number;

  public constructor(provider: string, status: number) {
    super(
      provider,
      "provider_http_error",
      `${provider} returned HTTP ${status}.`,
    );
    this.status = status;
  }
}

export class ProviderTransportError extends ProviderError {
  public constructor(provider: string, message: string) {
    super(provider, "provider_transport_error", message);
  }
}

export class ProviderPayloadError extends ProviderError {
  public constructor(provider: string, message: string) {
    super(provider, "provider_payload_error", message);
  }
}

export class ProviderNoResultError extends ProviderError {
  public constructor(provider: string) {
    super(
      provider,
      "provider_no_result",
      `${provider} returned no usable result.`,
    );
  }
}
