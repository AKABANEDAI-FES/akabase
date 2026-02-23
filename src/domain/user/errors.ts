/**
 * User domain errors
 */

export type UserErrorCode = "USER_NOT_FOUND" | "INVALID_ROLE" | "ROLE_ASSIGNMENT_FAILED";

export type UserError = {
  code: UserErrorCode;
  message: string;
};

export function userError(code: UserErrorCode, message: string): UserError {
  return { code, message };
}
