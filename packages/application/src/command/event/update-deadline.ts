/**
 * Update deadline command
 * Updates an existing deadline's dates
 */

import { Result } from "@akabase/result";
import type { DeadlineId, EventId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import { updateDeadlineEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

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
