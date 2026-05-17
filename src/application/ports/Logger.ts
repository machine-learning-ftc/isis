export type LogContext = Record<string, unknown>;

export interface Logger {
  child(bindings: LogContext): Logger;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
