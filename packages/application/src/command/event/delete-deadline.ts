/**
 * Delete deadline command
 * Deletes a deadline from an event
 */

import { Result } from "@archive/result";
import type { DeadlineId, EventId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

export type DeleteDeadlineInput = {
  deadlineId: DeadlineId;
  eventId: EventId;
  actor: Actor;
};

export type DeleteDeadlineOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteDeadlineError = EventError | AuthorizationError;

export async function deleteDeadline(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: DeleteDeadlineInput,
): Result.ResultAsync<DeleteDeadlineOutput, DeleteDeadlineError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    await deps.eventRepo.deleteDeadline(input.eventId, input.deadlineId);

    return { success: true as const, eventId: input.eventId };
  });
}
