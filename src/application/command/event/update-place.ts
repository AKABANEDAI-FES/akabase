import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, PlaceId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { canModifyEvent, updatePlaceEntity } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Update place input
 * Note: parentId cannot be changed after creation to avoid circular reference complexity
 */
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

export type UpdatePlaceError = EventError | RepositoryError | AuthorizationError;

/**
 * Update an existing place
 */
export async function updatePlace(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: UpdatePlaceInput,
): Result.ResultAsync<UpdatePlaceOutput, UpdatePlaceError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    const event = yield* $(await deps.eventRepo.findById(input.eventId));
    if (!event) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.EVENT_NOT_FOUND, "イベントが見つかりません")),
      );
    }
    yield* $(canModifyEvent(event));

    // Find existing place
    const existingPlaces = yield* $(await deps.eventRepo.findPlaces(input.eventId));
    const existingPlace = existingPlaces.find((p) => p.id === input.placeId);

    if (!existingPlace) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.PLACE_NOT_FOUND, "場所が見つかりません")),
      );
    }

    // Check place name uniqueness within same hierarchy level (exclude self)
    yield* $(
      await deps.eventDomainService.ensurePlaceNameUnique(
        input.eventId,
        input.name,
        existingPlace.parentId,
        input.placeId,
      ),
    );

    // Update place (name only, parent cannot be changed)
    const updatedPlace = yield* $(updatePlaceEntity(existingPlace, { name: input.name }));

    yield* $(await deps.eventRepo.savePlace(updatedPlace));

    return { success: true as const, eventId: input.eventId };
  });
}
