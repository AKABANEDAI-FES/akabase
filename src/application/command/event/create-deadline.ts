import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { DeadlineId, EventId } from "@/domain/shared/ids";
import type { DeadlineFieldKey } from "@/domain/event/schema";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { createDeadlineEntity } from "@/domain/event/logic";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Create deadline input
 */
export type CreateDeadlineInput = {
  eventId: EventId;
  fieldKey: DeadlineFieldKey;
  startAt?: Date;
  deadlineAt: Date;
  actor: Actor;
};

export type CreateDeadlineOutput = {
  deadlineId: DeadlineId;
  eventId: EventId;
};

export type CreateDeadlineError = EventError | AuthorizationError;

/**
 * Create a new deadline for a field
 *
 * Business rules:
 * - Only Event Committee Admin can manage deadlines
 * - Event must not be archived
 * - One deadline per fieldKey per event (UPSERT behavior)
 */
export async function createDeadline(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: CreateDeadlineInput,
): Result.ResultAsync<CreateDeadlineOutput, CreateDeadlineError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Check if deadline already exists for this fieldKey
    const existingDeadlines = await deps.eventRepo.findDeadlines(input.eventId);
    const existingDeadline = existingDeadlines.find((d) => d.fieldKey === input.fieldKey);

    if (existingDeadline) {
      return yield* $(
        Result.fail(
          eventError(
            EVENT_ERROR_CODE.DEADLINE_ALREADY_EXISTS,
            `フィールド「${input.fieldKey}」の締切は既に設定されています。更新する場合は編集してください。`,
          ),
        ),
      );
    }

    // Create deadline entity
    const deadlineId = generateId<DeadlineId>();
    const deadline = yield* $(
      createDeadlineEntity({
        id: deadlineId,
        eventId: input.eventId,
        fieldKey: input.fieldKey,
        startAt: input.startAt,
        deadlineAt: input.deadlineAt,
      }),
    );

    // Save deadline (UPSERT in repository layer)
    await deps.eventRepo.saveDeadline(deadline);

    return { deadlineId, eventId: input.eventId };
  });
}
