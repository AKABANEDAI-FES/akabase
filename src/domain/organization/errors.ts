import type { BaseError, DomainErrorCodeOf } from "../shared/errors";
import { createError } from "../shared/errors";

export const ORGANIZATION_ERROR_CODE = {
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_ALREADY_MEMBER: "USER_ALREADY_MEMBER",
  USER_NOT_MEMBER: "USER_NOT_MEMBER",
  NOT_MANAGER: "NOT_MANAGER",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  INVALID_ROLE: "INVALID_ROLE",
} as const;

export type OrganizationErrorCode = DomainErrorCodeOf<typeof ORGANIZATION_ERROR_CODE>;

export type OrganizationError = BaseError<OrganizationErrorCode>;

export function organizationError(code: OrganizationErrorCode, message: string): OrganizationError {
  return createError(code, message);
}
