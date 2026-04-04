/**
 * Delete place command
 * Deletes a place from an event
 */

import { Result } from "@akabase/result";
import type { EventId, PlaceId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type DeletePlaceInput = {
  placeId: PlaceId;
  eventId: EventId;
  actor: Actor;
};

export type DeletePlaceOutput = {
  success: true;
  eventId: EventId;
};

export type DeletePlaceError = EventError | AuthorizationError;

export async function deletePlace(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: DeletePlaceInput,
): Result.ResultAsync<DeletePlaceOutput, DeletePlaceError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    await deps.eventRepo.deletePlace(input.eventId, input.placeId);

    return { success: true as const, eventId: input.eventId };
  });
}
