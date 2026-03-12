/**
 * Update tag command
 * Updates an existing tag's name
 */

import { Result } from "@archive/result";
import type { EventId, TagId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@archive/domain/event/errors";
import { updateTagEntity } from "@archive/domain/event/logic";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

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
