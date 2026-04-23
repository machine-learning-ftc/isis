import {
  Counter,
  collectDefaultMetrics,
  Histogram,
  Registry,
} from "prom-client";

type ProviderStatus = "success" | "error";

export interface MetricsRegistry {
  contentType: string;
  getMetrics(): Promise<string>;
  recordHttpRequest(
    route: string,
    method: string,
    statusCode: number,
    durationMs: number,
  ): void;
  recordProviderCall(
    provider: string,
    status: ProviderStatus,
    durationMs: number,
  ): void;
  incrementFallback(): void;
}

export class PrometheusMetricsRegistry implements MetricsRegistry {
  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<"route" | "method" | "status">;
  private readonly httpRequestDurationMs: Histogram<"route" | "method">;
  private readonly providerCallsTotal: Counter<"provider" | "status">;
  private readonly providerDurationMs: Histogram<"provider">;
  private readonly fallbackTotal: Counter<never>;

  public constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({
      register: this.registry,
    });

    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests handled by the service.",
      labelNames: ["route", "method", "status"] as const,
      registers: [this.registry],
    });

    this.httpRequestDurationMs = new Histogram({
      name: "http_request_duration_ms",
      help: "HTTP request duration in milliseconds.",
      labelNames: ["route", "method"] as const,
      registers: [this.registry],
      buckets: [25, 50, 100, 200, 400, 700, 1000],
    });

    this.providerCallsTotal = new Counter({
      name: "provider_calls_total",
      help: "Total number of provider calls.",
      labelNames: ["provider", "status"] as const,
      registers: [this.registry],
    });

    this.providerDurationMs = new Histogram({
      name: "provider_duration_ms",
      help: "Provider call duration in milliseconds.",
      labelNames: ["provider"] as const,
      registers: [this.registry],
      buckets: [25, 50, 100, 200, 400, 700, 1000],
    });

    this.fallbackTotal = new Counter({
      name: "check_fallback_total",
      help: "Total number of requests that required ML fallback.",
      registers: [this.registry],
    });
  }

  public get contentType(): string {
    return this.registry.contentType;
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  public recordHttpRequest(
    route: string,
    method: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.httpRequestsTotal.inc({
      route,
      method,
      status: statusCode.toString(),
    });
    this.httpRequestDurationMs.observe({ route, method }, durationMs);
  }

  public recordProviderCall(
    provider: string,
    status: ProviderStatus,
    durationMs: number,
  ): void {
    this.providerCallsTotal.inc({ provider, status });
    this.providerDurationMs.observe({ provider }, durationMs);
  }

  public incrementFallback(): void {
    this.fallbackTotal.inc();
  }
}

export const createMetricsRegistry = (): MetricsRegistry =>
  new PrometheusMetricsRegistry();
