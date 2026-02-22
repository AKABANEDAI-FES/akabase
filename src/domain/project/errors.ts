import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

export type ProjectErrorCode =
  | "ALREADY_SUBMITTED"
  | "NOT_SUBMITTED"
  | "INVALID_STATUS"
  | "CANNOT_WITHDRAW"
  | "CANNOT_APPROVE"
  | "CANNOT_RETURN"
  | "PROJECT_NOT_FOUND"
  | "DRAFT_NOT_FOUND"
  | "SUBMISSION_NOT_FOUND"
  | "FIELD_NOT_EDITABLE";

export type ProjectError = BaseError<ProjectErrorCode>;

export function projectError(code: ProjectErrorCode, message: string): ProjectError {
  return createError(code, message);
}
