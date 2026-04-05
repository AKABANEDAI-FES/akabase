/**
 * Update tag command
 * Updates an existing tag's name
 */

import { Result } from "@akabase/result";
import type { EventId, TagId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import { updateTagEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type UpdateTagInput = {
  tagId: TagId;
  eventId: EventId;
  name: string;
  actor: Actor;
};

export type UpdateTagOutput = {
  success: true;
  eventId: EventId;
};

export type UpdateTagError = EventError | AuthorizationError;

export async function updateTag(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdateTagInput,
): Result.ResultAsync<UpdateTagOutput, UpdateTagError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingTags = await deps.eventRepo.findTags(input.eventId);
    const existingTag = existingTags.find((t) => t.id === input.tagId);

    if (!existingTag) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.TAG_NOT_FOUND, "タグが見つかりません")),
      );
    }

    yield* $(
      await deps.eventDomainService.ensureTagNameUnique(input.eventId, input.name, input.tagId),
    );

    const updatedTag = yield* $(updateTagEntity(existingTag, { name: input.name }));

    await deps.eventRepo.saveTag(updatedTag);

    return { success: true as const, eventId: input.eventId };
  });
}
