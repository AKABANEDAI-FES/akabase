/**
 * Authorization error types
 */

import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

/**
 * Authorization error codes
 */
export const AUTHORIZATION_ERROR_CODE = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  UNKNOWN_RESOURCE: "UNKNOWN_RESOURCE",
  UNKNOWN_ACTION: "UNKNOWN_ACTION",
  ACTOR_RESOLUTION_FAILED: "ACTOR_RESOLUTION_FAILED",
} as const;

export type AuthorizationErrorCode =
  (typeof AUTHORIZATION_ERROR_CODE)[keyof typeof AUTHORIZATION_ERROR_CODE];

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
