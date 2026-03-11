/**
 * Shared query layer utilities and exception handling
 */

/**
 * Query error codes
 */
export type QueryErrorCode = "DATABASE_ERROR" | "ACTOR_RESOLUTION_FAILED" | "VALIDATION_ERROR";

/**
 * Query exception class
 * Thrown when query operations fail due to infrastructure or unexpected errors
 */
export class QueryException extends Error {
  readonly code: QueryErrorCode;
  readonly cause?: unknown;

  constructor(code: QueryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "QueryException";
    this.code = code;
    this.cause = cause;
  }
}
