import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, TagId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
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
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: DeleteTagInput,
): Result.ResultAsync<DeleteTagOutput, DeleteTagError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Delete tag
    yield* $(await deps.eventRepo.deleteTag(input.eventId, input.tagId));

    return { success: true as const, eventId: input.eventId };
  });
}
