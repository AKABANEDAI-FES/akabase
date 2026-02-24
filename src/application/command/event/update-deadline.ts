import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { DeadlineId, EventId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { canModifyEvent, updateDeadlineEntity } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
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
  deadlineAt: Date;
  actor: Actor;
};

export type UpdateDeadlineOutput = {
  success: true;
  eventId: EventId;
};

export type UpdateDeadlineError = EventError | RepositoryError | AuthorizationError;

/**
 * Update an existing deadline
 */
export async function updateDeadline(
  deps: Pick<Dependencies, "eventRepo" | "authService">,
  input: UpdateDeadlineInput,
): Result.ResultAsync<UpdateDeadlineOutput, UpdateDeadlineError> {
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

    // Find existing deadline
    const existingDeadlines = yield* $(await deps.eventRepo.findDeadlines(input.eventId));
    const existingDeadline = existingDeadlines.find((d) => d.id === input.deadlineId);

    if (!existingDeadline) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.DEADLINE_NOT_FOUND, "締切が見つかりません")),
      );
    }

    // Update deadline (fieldKey is immutable)
    const updatedDeadline = yield* $(
      updateDeadlineEntity(existingDeadline, { deadlineAt: input.deadlineAt }),
    );

    yield* $(await deps.eventRepo.saveDeadline(updatedDeadline));

    return { success: true as const, eventId: input.eventId };
  });
}
