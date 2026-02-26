/**
 * Repository Error
 * Infrastructure layer errors (database, network, etc.)
 */
export type RepositoryErrorCode = "NOT_FOUND" | "DATABASE_ERROR" | "UNKNOWN_ERROR";

export type RepositoryError = {
  code: RepositoryErrorCode;
  message: string;
};

export function repositoryError(
  code: RepositoryErrorCode,
  message: string,
  error?: unknown,
): RepositoryError {
  // Log the underlying error for debugging purposes
  if (error) {
    console.error(`[RepositoryError] ${code}: ${message}`, error);
  }
  return { code, message };
}

/**
 * Repository Exception
 * Exception for unrecoverable infrastructure failures (database errors, connection issues)
 */
export class RepositoryException extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RepositoryException";

    // Log the underlying error for debugging purposes
    console.error(`[RepositoryException] ${code}: ${message}`, cause);
  }
}
