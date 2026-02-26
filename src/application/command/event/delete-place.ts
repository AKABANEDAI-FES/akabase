import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, PlaceId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
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

export type DeletePlaceError = EventError | AuthorizationError;

/**
 * Delete a place
 */
export async function deletePlace(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: DeletePlaceInput,
): Result.ResultAsync<DeletePlaceOutput, DeletePlaceError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Delete place
    await deps.eventRepo.deletePlace(input.eventId, input.placeId);

    return { success: true as const, eventId: input.eventId };
  });
}
