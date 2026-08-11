/**
 * API key domain logic
 * Pure functions for API key validation
 */

import { Result } from "@akabase/result";
import { apiKeyNameSchema } from "./schema";
import type { ApiKeyError } from "./errors";
import { apiKeyError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";

/**
 * Validate an API key name
 */
export function validateApiKeyName(name: string): Result.Result<string, ApiKeyError> {
  return Result.try({
    try: () => apiKeyNameSchema.parse(name),
    catch: () => apiKeyError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "APIキー名が不正です"),
  });
}
