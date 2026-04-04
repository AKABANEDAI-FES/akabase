/**
 * Delete deadline command
 * Deletes a deadline from an event
 */

import { Result } from "@akabase/result";
import type { DeadlineId, EventId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

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
