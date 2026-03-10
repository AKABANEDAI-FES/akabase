/**
 * User domain errors
 */

import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

export const USER_ERROR_CODE = {
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_ROLE: "INVALID_ROLE",
  ROLE_ASSIGNMENT_FAILED: "ROLE_ASSIGNMENT_FAILED",
} as const;

export type UserErrorCode = (typeof USER_ERROR_CODE)[keyof typeof USER_ERROR_CODE];

export type UserError = BaseError<UserErrorCode>;

export function userError(code: UserErrorCode, message: string): UserError {
  return createError(code, message);
}
