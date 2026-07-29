/**
 * Create API key command
 * Issues an API key scoped to a single event
 */

import { Result } from "@akabase/result";
import type { ApiKeyId } from "@akabase/domain/api-key/schema";
import type { ApiKeyError } from "@akabase/domain/api-key/errors";
import { validateApiKeyName } from "@akabase/domain/api-key/logic";
import type { ApiKeyService } from "@akabase/domain/api-key/service";
import type { EventId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { apiKeyResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";

export type CreateApiKeyInput = {
  name: string;
  eventId: EventId;
  actor: Actor;
};

export type CreateApiKeyOutput = {
  apiKeyId: ApiKeyId;
  key: string;
};

export type CreateApiKeyError = ApiKeyError | EventError | AuthorizationError;

/**
 * Create an API key
 *
 * Business rules:
 * - Only global admins can create API keys
 * - The plaintext key is returned only once and cannot be retrieved again
 *
 * @param deps - Dependencies (repositories, authService)
 * @param input - API key creation input
 * @returns Created key ID and the plaintext key
 */
export async function createApiKey(
  deps: {
    eventRepo: EventRepository;
    apiKeyService: ApiKeyService;
    authService: AuthorizationService;
  },
  input: CreateApiKeyInput,
): Result.ResultAsync<CreateApiKeyOutput, CreateApiKeyError> {
  return Result.gen(async function* ($) {
    yield* $(deps.authService.enforce(input.actor, apiKeyResource(), "api_key:create"));

    const name = yield* $(validateApiKeyName(input.name));

    const event = await deps.eventRepo.findById(input.eventId);
    if (event === null) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.EVENT_NOT_FOUND, "イベントが見つかりません")),
      );
    }

    const created = yield* $(
      await deps.apiKeyService.create({
        name,
        eventId: input.eventId,
        userId: input.actor.userId,
      }),
    );

    return { apiKeyId: created.id, key: created.key };
  });
}
