export class DomainError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = new.target.name;
  }
}

export class InvalidInputError extends DomainError {
  public constructor(message: string) {
    super("invalid_input", message);
  }
}

export class ProvidersUnavailableError extends DomainError {
  public constructor() {
    super(
      "providers_unavailable",
      "No provider could verify the claim at this time.",
    );
  }
}
