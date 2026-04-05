/**
 * Create place command
 * Creates a new place for an event
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { EventId, PlaceId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import { createPlaceEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type CreatePlaceInput = {
  eventId: EventId;
  name: string;
  parentId: PlaceId | null;
  actor: Actor;
};

export type CreatePlaceOutput = {
  placeId: PlaceId;
  eventId: EventId;
};

export type CreatePlaceError = EventError | AuthorizationError;

export async function createPlace(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: CreatePlaceInput,
): Result.ResultAsync<CreatePlaceOutput, CreatePlaceError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    if (input.parentId) {
      const existingPlaces = await deps.eventRepo.findPlaces(input.eventId);
      const parentPlace = existingPlaces.find((p) => p.id === input.parentId);
      if (!parentPlace) {
        return yield* $(
          Result.fail(eventError(EVENT_ERROR_CODE.PLACE_NOT_FOUND, "親の場所が見つかりません")),
        );
      }
    }

    yield* $(
      await deps.eventDomainService.ensurePlaceNameUnique(
        input.eventId,
        input.name,
        input.parentId,
      ),
    );

    const placeId = generateId<PlaceId>();
    const place = yield* $(
      createPlaceEntity({
        id: placeId,
        eventId: input.eventId,
        name: input.name,
        parentId: input.parentId,
      }),
    );

    await deps.eventRepo.savePlace(place);

    return { placeId, eventId: input.eventId };
  });
}
