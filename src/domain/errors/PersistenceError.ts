import { DomainError } from "./DomainError";

export class PersistenceError extends DomainError {
  public constructor(message: string) {
    super("persistence_error", message);
  }
}
