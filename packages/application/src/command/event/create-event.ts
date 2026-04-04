/**
 * Create event command
 * Creates a new event with a unique slug
 */

import { Result } from "@akabase/result";
import { cast, generateId } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { createEventEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type CreateEventInput = {
  name: string;
  slug: string;
  actor: Actor;
};

export type CreateEventOutput = {
  eventId: EventId;
};

export type CreateEventError = EventError | AuthorizationError;

export async function createEvent(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: CreateEventInput,
): Result.ResultAsync<CreateEventOutput, CreateEventError> {
  return Result.gen(async function* ($) {
    const placeholderResource = eventResource(cast<EventId>(""));
    yield* $(deps.authService.enforce(input.actor, placeholderResource, "event:create"));

    const eventId = generateId<EventId>();

    yield* $(await deps.eventDomainService.ensureSlugUnique(input.slug));

    const event = yield* $(
      createEventEntity({
        id: eventId,
        name: input.name,
        slug: input.slug,
      }),
    );

    await deps.eventRepo.saveEvent(event);

    return { eventId };
  });
}
