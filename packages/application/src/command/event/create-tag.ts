/**
 * Create tag command
 * Creates a new tag for an event
 */

import { Result } from "@archive/result";
import { generateId } from "@archive/domain/shared/ids";
import type { EventId, TagId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import { createTagEntity } from "@archive/domain/event/logic";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

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
