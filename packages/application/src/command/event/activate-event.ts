/**
 * Activate event command
 * Activates an archived event
 */

import { Result } from "@archive/result";
import type { EventId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@archive/domain/event/errors";
import { activateEvent as activateEventLogic } from "@archive/domain/event/logic";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";

export type ActivateEventInput = {
  eventId: EventId;
  actor: Actor;
};

export type ActivateEventOutput = {
  eventId: EventId;
};

export type ActivateEventError = EventError | AuthorizationError;

export async function activateEvent(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
  },
  input: ActivateEventInput,
): Result.ResultAsync<ActivateEventOutput, ActivateEventError> {
  return Result.gen(async function* ($) {
    const event = await deps.eventRepo.findById(input.eventId);

    if (!event) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.EVENT_NOT_FOUND, "イベントが見つかりません")),
      );
    }

    const resource = eventResource(input.eventId, event);
    yield* $(deps.authService.enforce(input.actor, resource, "event:activate"));

    if (event.status === "active") {
      return yield* $(
        Result.fail(
          eventError(EVENT_ERROR_CODE.EVENT_ALREADY_ACTIVE, "このイベントは既にアクティブです"),
        ),
      );
    }

    const activatedEvent = yield* $(activateEventLogic(event));

    await deps.eventRepo.saveEvent(activatedEvent);

    return { eventId: input.eventId };
  });
}
