import pino, { type Logger as PinoLogger } from "pino";
import type { LogContext, Logger } from "../../application/ports/Logger";
import type { Env } from "../config/env";

class PinoLoggerAdapter implements Logger {
  private readonly logger: PinoLogger;

  public constructor(logger: PinoLogger) {
    this.logger = logger;
  }

  public child(bindings: LogContext): Logger {
    return new PinoLoggerAdapter(this.logger.child(bindings));
  }

  public info(message: string, context?: LogContext): void {
    this.logger.info(context ?? {}, message);
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(context ?? {}, message);
  }

  public error(message: string, context?: LogContext): void {
    this.logger.error(context ?? {}, message);
  }
}

export const createLogger = (env: Env): Logger =>
  new PinoLoggerAdapter(
    pino({
      level: env.LOG_LEVEL,
      base: {
        service: "fact-verification-api",
        env: env.ENV,
      },
      redact: {
        paths: [
          "FACT_CHECK_API_KEY",
          "ML_SERVICE_API_KEY",
          "authorization",
          "req.headers.authorization",
        ],
        censor: "[REDACTED]",
      },
    }),
  );
