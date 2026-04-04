/**
 * Create tag command
 * Creates a new tag for an event
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { EventId, TagId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { createTagEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type CreateTagInput = {
  eventId: EventId;
  name: string;
  actor: Actor;
};

export type CreateTagOutput = {
  tagId: TagId;
  eventId: EventId;
};

export type CreateTagError = EventError | AuthorizationError;

export async function createTag(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: CreateTagInput,
): Result.ResultAsync<CreateTagOutput, CreateTagError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    yield* $(await deps.eventDomainService.ensureTagNameUnique(input.eventId, input.name));

    const maxDisplayOrder = await deps.eventRepo.getMaxTagDisplayOrder(input.eventId);

    const tagId = generateId<TagId>();
    const tag = yield* $(
      createTagEntity({
        id: tagId,
        eventId: input.eventId,
        name: input.name,
        displayOrder: maxDisplayOrder + 1,
      }),
    );

    await deps.eventRepo.saveTag(tag);

    return { tagId, eventId: input.eventId };
  });
}
