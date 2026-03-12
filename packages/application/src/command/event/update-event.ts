/**
 * Update event command
 * Updates an existing event's name and slug
 */

import { Result } from "@archive/result";
import type { EventId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import { updateEventEntity } from "@archive/domain/event/logic";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

export type UpdateEventInput = {
  eventId: EventId;
  name: string;
  slug: string;
  actor: Actor;
};

export type UpdateEventOutput = {
  eventId: EventId;
};

export type UpdateEventError = EventError | AuthorizationError;

export async function updateEvent(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdateEventInput,
): Result.ResultAsync<UpdateEventOutput, UpdateEventError> {
  return Result.gen(async function* ($) {
    const event = yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const resource = eventResource(input.eventId, event);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.ensureSlugUnique(input.slug, input.eventId));

    const updatedEvent = yield* $(
      updateEventEntity(event, {
        name: input.name,
        slug: input.slug,
      }),
    );

    await deps.eventRepo.saveEvent(updatedEvent);

    return { eventId: input.eventId };
  });
}
