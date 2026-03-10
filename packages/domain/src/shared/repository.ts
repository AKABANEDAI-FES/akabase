/**
 * Repository Error
 * Infrastructure layer errors (database, network, etc.)
 */

export const REPOSITORY_ERROR_CODE = {
  DATABASE_ERROR: "DATABASE_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;
export type RepositoryErrorCode =
  (typeof REPOSITORY_ERROR_CODE)[keyof typeof REPOSITORY_ERROR_CODE];

export type RepositoryError = {
  code: RepositoryErrorCode;
  message: string;
};

/**
 * Repository Exception
 * Exception for unrecoverable infrastructure failures (database errors, connection issues)
 */
export class RepositoryException extends Error {
  public readonly code: RepositoryErrorCode;
  public readonly cause?: unknown;

  constructor(code: RepositoryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "RepositoryException";
    this.code = code;
    this.cause = cause;
  }
}
