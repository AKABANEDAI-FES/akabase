import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, TagId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { canModifyEvent } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Delete tag input
 */
export type DeleteTagInput = {
  tagId: TagId;
  eventId: EventId;
  actor: Actor;
};

export type DeleteTagOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteTagError = EventError | RepositoryError | AuthorizationError;

/**
 * Delete a tag
 *
 * Note: CASCADE deletion will automatically remove tag associations
 */
export async function deleteTag(
  deps: Pick<Dependencies, "eventRepo" | "authService">,
  input: DeleteTagInput,
): Result.ResultAsync<DeleteTagOutput, DeleteTagError> {
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

    // Delete tag
    yield* $(await deps.eventRepo.deleteTag(input.tagId));

    return { success: true as const, eventId: input.eventId };
  });
}
