/**
 * Authorization error types
 */

import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

/**
 * Authorization error codes
 */
export type AuthorizationErrorCode =
  | "PERMISSION_DENIED"
  | "UNKNOWN_RESOURCE"
  | "UNKNOWN_ACTION"
  | "ACTOR_RESOLUTION_FAILED";

/**
 * Authorization error type
 */
export type AuthorizationError = BaseError<AuthorizationErrorCode>;

/**
 * Create an authorization error
 *
 * @param code - Error code
 * @param message - Error message
 * @returns Authorization error
 */
export function authorizationError(
  code: AuthorizationErrorCode,
  message: string,
): AuthorizationError {
  return createError(code, message);
}
