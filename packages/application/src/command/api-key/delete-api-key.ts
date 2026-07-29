/**
 * Delete API key command
 * Deletes an API key
 */

import { Result } from "@akabase/result";
import type { ApiKeyId } from "@akabase/domain/api-key/schema";
import type { ApiKeyError } from "@akabase/domain/api-key/errors";
import type { ApiKeyService } from "@akabase/domain/api-key/service";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { apiKeyResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";

export type DeleteApiKeyInput = {
  apiKeyId: ApiKeyId;
  actor: Actor;
};

export type DeleteApiKeyOutput = {
  success: true;
};

export type DeleteApiKeyError = ApiKeyError | AuthorizationError;

/**
 * Delete an API key
 *
 * Business rules:
 * - Only global admins can delete API keys
 * - Any admin can delete keys created by other admins
 *
 * @param deps - Dependencies (services, authService)
 * @param input - API key deletion input
 * @returns Success or error
 */
export async function deleteApiKey(
  deps: {
    apiKeyService: ApiKeyService;
    authService: AuthorizationService;
  },
  input: DeleteApiKeyInput,
): Result.ResultAsync<DeleteApiKeyOutput, DeleteApiKeyError> {
  return Result.gen(async function* ($) {
    yield* $(deps.authService.enforce(input.actor, apiKeyResource(), "api_key:delete"));

    yield* $(await deps.apiKeyService.delete(input.apiKeyId));

    return { success: true as const };
  });
}
