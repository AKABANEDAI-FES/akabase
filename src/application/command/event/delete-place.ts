import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, PlaceId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { canModifyEvent } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Delete place input
 */
export type DeletePlaceInput = {
  placeId: PlaceId;
  eventId: EventId;
  actor: Actor;
};

export type DeletePlaceOutput = {
  success: true;
  eventId: EventId;
};

export type DeletePlaceError = EventError | RepositoryError | AuthorizationError;

/**
 * Delete a place
 */
export async function deletePlace(
  deps: Pick<Dependencies, "eventRepo" | "authService">,
  input: DeletePlaceInput,
): Result.ResultAsync<DeletePlaceOutput, DeletePlaceError> {
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

    // Delete place
    yield* $(await deps.eventRepo.deletePlace(input.placeId));

    return { success: true as const, eventId: input.eventId };
  });
}
