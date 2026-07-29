/**
 * API key domain errors
 */

import type { BaseError, DomainErrorCodeOf } from "../shared/errors";
import { createError } from "../shared/errors";

export const API_KEY_ERROR_CODE = {
  API_KEY_NOT_FOUND: "API_KEY_NOT_FOUND",
  API_KEY_CREATION_FAILED: "API_KEY_CREATION_FAILED",
  API_KEY_DELETION_FAILED: "API_KEY_DELETION_FAILED",
} as const;

export type ApiKeyErrorCode = DomainErrorCodeOf<typeof API_KEY_ERROR_CODE>;

export type ApiKeyError = BaseError<ApiKeyErrorCode>;

export function apiKeyError(code: ApiKeyError["code"], message: string): ApiKeyError {
  return createError(code, message);
}
