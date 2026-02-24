import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

export const ORGANIZATION_ERROR_CODE = {
  USER_ALREADY_MEMBER: "USER_ALREADY_MEMBER",
  USER_NOT_MEMBER: "USER_NOT_MEMBER",
  NOT_MANAGER: "NOT_MANAGER",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  INVALID_ROLE: "INVALID_ROLE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type OrganizationErrorCode =
  (typeof ORGANIZATION_ERROR_CODE)[keyof typeof ORGANIZATION_ERROR_CODE];

export type OrganizationError = BaseError<OrganizationErrorCode>;

export function organizationError(code: OrganizationErrorCode, message: string): OrganizationError {
  return createError(code, message);
}
