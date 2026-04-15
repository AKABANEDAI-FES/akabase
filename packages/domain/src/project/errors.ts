import type { BaseError, DomainErrorCodeOf } from "../shared/errors";
import { createError } from "../shared/errors";

export const PROJECT_ERROR_CODE = {
  ALREADY_SUBMITTED: "ALREADY_SUBMITTED",
  NOT_SUBMITTED: "NOT_SUBMITTED",
  INVALID_STATUS: "INVALID_STATUS",
  CANNOT_WITHDRAW: "CANNOT_WITHDRAW",
  CANNOT_APPROVE: "CANNOT_APPROVE",
  CANNOT_RETURN: "CANNOT_RETURN",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  DRAFT_NOT_FOUND: "DRAFT_NOT_FOUND",
  SUBMISSION_NOT_FOUND: "SUBMISSION_NOT_FOUND",
  PUBLISHED_NOT_FOUND: "PUBLISHED_NOT_FOUND",
  FIELD_NOT_EDITABLE: "FIELD_NOT_EDITABLE",
  CONTEST_VOTE_NUMBER_NOT_UNIQUE: "CONTEST_VOTE_NUMBER_NOT_UNIQUE",
} as const;

export type ProjectErrorCode = DomainErrorCodeOf<typeof PROJECT_ERROR_CODE>;

export type ProjectError = BaseError<ProjectErrorCode>;

export function projectError(code: ProjectErrorCode, message: string): ProjectError {
  return createError(code, message);
}
