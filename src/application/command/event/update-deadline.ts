import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { DeadlineId, EventId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { updateDeadlineEntity } from "@/domain/event/logic";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Update deadline input
 * Note: fieldKey is immutable and cannot be changed after creation
 */
export type UpdateDeadlineInput = {
  deadlineId: DeadlineId;
  eventId: EventId;
  startAt?: Date;
  deadlineAt: Date;
  actor: Actor;
};

export type UpdateDeadlineOutput = {
  success: true;
  eventId: EventId;
};

export type UpdateDeadlineError = EventError | AuthorizationError;

/**
 * Update an existing deadline
 */
export async function updateDeadline(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: UpdateDeadlineInput,
): Result.ResultAsync<UpdateDeadlineOutput, UpdateDeadlineError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Find existing deadline
    const existingDeadlines = await deps.eventRepo.findDeadlines(input.eventId);
    const existingDeadline = existingDeadlines.find((d) => d.id === input.deadlineId);

    if (!existingDeadline) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.DEADLINE_NOT_FOUND, "締切が見つかりません")),
      );
    }

    // Update deadline (fieldKey is immutable)
    const updatedDeadline = yield* $(
      updateDeadlineEntity(existingDeadline, {
        startAt: input.startAt,
        deadlineAt: input.deadlineAt,
      }),
    );

    await deps.eventRepo.saveDeadline(updatedDeadline);

    return { success: true as const, eventId: input.eventId };
  });
}
