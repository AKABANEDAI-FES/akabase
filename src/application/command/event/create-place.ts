import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, PlaceId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { createPlaceEntity } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Create place input
 */
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

export type CreatePlaceError = EventError | RepositoryError | AuthorizationError;

/**
 * Create a new place for an event
 */
export async function createPlace(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: CreatePlaceInput,
): Result.ResultAsync<CreatePlaceOutput, CreatePlaceError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Verify parent exists if parentId is provided
    if (input.parentId) {
      const existingPlaces = yield* $(await deps.eventRepo.findPlaces(input.eventId));
      const parentPlace = existingPlaces.find((p) => p.id === input.parentId);
      if (!parentPlace) {
        return yield* $(
          Result.fail(eventError(EVENT_ERROR_CODE.PLACE_NOT_FOUND, "親の場所が見つかりません")),
        );
      }
    }

    // Check place name uniqueness within same hierarchy level
    yield* $(
      await deps.eventDomainService.ensurePlaceNameUnique(
        input.eventId,
        input.name,
        input.parentId,
      ),
    );

    // Create place entity
    const placeId = generateId<PlaceId>();
    const place = yield* $(
      createPlaceEntity({
        id: placeId,
        eventId: input.eventId,
        name: input.name,
        parentId: input.parentId,
      }),
    );

    // Save place
    yield* $(await deps.eventRepo.savePlace(place));

    return { placeId, eventId: input.eventId };
  });
}
