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
  constructor(
    public readonly code: QueryErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "QueryException";
    console.error(`[QueryException] ${code}: ${message}`, cause);
  }
}
