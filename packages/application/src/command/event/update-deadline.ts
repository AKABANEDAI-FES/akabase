/**
 * Update deadline command
 * Updates an existing deadline's dates
 */

import { Result } from "@archive/result";
import type { DeadlineId, EventId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@archive/domain/event/errors";
import { updateDeadlineEntity } from "@archive/domain/event/logic";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

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

export async function updateDeadline(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdateDeadlineInput,
): Result.ResultAsync<UpdateDeadlineOutput, UpdateDeadlineError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingDeadlines = await deps.eventRepo.findDeadlines(input.eventId);
    const existingDeadline = existingDeadlines.find((d) => d.id === input.deadlineId);

    if (!existingDeadline) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.DEADLINE_NOT_FOUND, "締切が見つかりません")),
      );
    }

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
