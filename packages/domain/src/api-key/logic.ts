/**
 * API key domain logic
 * Pure functions for API key validation
 */

import { Result } from "@akabase/result";
import { apiKeyMetadataSchema, apiKeyNameSchema } from "./schema";
import type { ApiKeyMetadata } from "./schema";
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

/**
 * Parse API key metadata stored as a JSON string, or return null when it is not bound to an event
 */
export function parseApiKeyMetadata(metadata: string | null): ApiKeyMetadata | null {
  if (metadata === null) {
    return null;
  }
  try {
    const parsed = apiKeyMetadataSchema.safeParse(JSON.parse(metadata));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
