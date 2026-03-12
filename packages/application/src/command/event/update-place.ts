/**
 * Update place command
 * Updates an existing place's name
 */

import { Result } from "@archive/result";
import type { EventId, PlaceId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@archive/domain/event/errors";
import { updatePlaceEntity } from "@archive/domain/event/logic";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

export type UpdatePlaceInput = {
  placeId: PlaceId;
  eventId: EventId;
  name: string;
  actor: Actor;
};

export type UpdatePlaceOutput = {
  success: true;
  eventId: EventId;
};

export type UpdatePlaceError = EventError | AuthorizationError;

export async function updatePlace(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdatePlaceInput,
): Result.ResultAsync<UpdatePlaceOutput, UpdatePlaceError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingPlaces = await deps.eventRepo.findPlaces(input.eventId);
    const existingPlace = existingPlaces.find((p) => p.id === input.placeId);

    if (!existingPlace) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.PLACE_NOT_FOUND, "場所が見つかりません")),
      );
    }

    yield* $(
      await deps.eventDomainService.ensurePlaceNameUnique(
        input.eventId,
        input.name,
        existingPlace.parentId,
        input.placeId,
      ),
    );

    const updatedPlace = yield* $(updatePlaceEntity(existingPlace, { name: input.name }));

    await deps.eventRepo.savePlace(updatedPlace);

    return { success: true as const, eventId: input.eventId };
  });
}
