import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

export type OrganizationErrorCode =
  | "USER_ALREADY_MEMBER"
  | "USER_NOT_MEMBER"
  | "CANNOT_REMOVE_LAST_MANAGER"
  | "NOT_MANAGER"
  | "ORGANIZATION_NOT_FOUND"
  | "INVALID_ROLE";

export type OrganizationError = BaseError<OrganizationErrorCode>;

export function organizationError(code: OrganizationErrorCode, message: string): OrganizationError {
  return createError(code, message);
}
