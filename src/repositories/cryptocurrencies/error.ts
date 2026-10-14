import type { RepositoryErrors } from "./types.js";

class RepositoryError extends Error {
  readonly errorType: RepositoryErrors;

  constructor(errorType: RepositoryErrors, message: string) {
    super(message);
    this.errorType = errorType;
  }
}

export default RepositoryError;
