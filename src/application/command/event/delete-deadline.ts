import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { DeadlineId, EventId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Delete deadline input
 */
export type DeleteDeadlineInput = {
  deadlineId: DeadlineId;
  eventId: EventId;
  actor: Actor;
};

export type DeleteDeadlineOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteDeadlineError = EventError | RepositoryError | AuthorizationError;

/**
 * Delete a deadline
 */
export async function deleteDeadline(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: DeleteDeadlineInput,
): Result.ResultAsync<DeleteDeadlineOutput, DeleteDeadlineError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Delete deadline
    yield* $(await deps.eventRepo.deleteDeadline(input.eventId, input.deadlineId));

    return { success: true as const, eventId: input.eventId };
  });
}
