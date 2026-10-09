/**
 * Rotate API key command
 * Reissues an API key and revokes the original one immediately
 */

import { Result } from "@akabase/result";
import type { ApiKeyId } from "@akabase/domain/api-key/schema";
import type { ApiKeyError } from "@akabase/domain/api-key/errors";
import type { ApiKeyService } from "@akabase/domain/api-key/service";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { apiKeyResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";

export type RotateApiKeyInput = {
  apiKeyId: ApiKeyId;
  actor: Actor;
};

export type RotateApiKeyOutput = {
  apiKeyId: ApiKeyId;
  key: string;
};

export type RotateApiKeyError = ApiKeyError | AuthorizationError;

/**
 * Rotate an API key
 *
 * Business rules:
 * - Only global admins can rotate API keys
 * - The new key keeps the name and target event of the original key
 * - The original key is revoked immediately, without a grace period
 * - The plaintext key is returned only once and cannot be retrieved again
 *
 * @param deps - Dependencies (services, authService)
 * @param input - API key rotation input
 * @returns New key ID and the plaintext key
 */
export async function rotateApiKey(
  deps: {
    apiKeyService: ApiKeyService;
    authService: AuthorizationService;
  },
  input: RotateApiKeyInput,
): Result.ResultAsync<RotateApiKeyOutput, RotateApiKeyError> {
  return Result.gen(async function* ($) {
    yield* $(deps.authService.enforce(input.actor, apiKeyResource(), "api_key:rotate"));

    const rotated = yield* $(
      await deps.apiKeyService.rotate({
        id: input.apiKeyId,
        userId: input.actor.userId,
      }),
    );

    return { apiKeyId: rotated.id, key: rotated.key };
  });
}
