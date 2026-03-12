/**
 * Delete place command
 * Deletes a place from an event
 */

import { Result } from "@archive/result";
import type { EventId, PlaceId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

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
