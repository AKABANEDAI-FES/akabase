import { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import type { EventId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { eventError } from "@/domain/event/errors";
import { activateEvent as activateEventLogic } from "@/domain/event/logic";
import type { RepositoryError } from "@/infrastructure/repositories/interfaces";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/actor";
import { eventResource } from "@/domain/authorization/resource";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for activating an event
 */
export type ActivateEventInput = {
  eventId: EventId;
  actor: Actor;
};

/**
 * Output of event activation
 */
export type ActivateEventOutput = {
  eventId: EventId;
};

/**
 * Errors that can occur during event activation
 */
export type ActivateEventError = EventError | RepositoryError | AuthorizationError;

/**
 * Activate an archived event
 *
 * Business rules:
 * - Only global admins or event committee admins can activate events
 * - Event must exist
 * - Event must not be already active
 * - Status changes to "active"
 * - Activated events can be edited again
 *
 * @param deps - Dependencies (repositories, authService)
 * @param input - Event activate input
 * @returns Result with event ID or error
 */
export async function activateEvent(
  deps: Pick<Dependencies, "eventRepo" | "authService">,
  input: ActivateEventInput,
): Result.ResultAsync<ActivateEventOutput, ActivateEventError> {
  return suspend(() =>
    gen(async function* ($) {
      // Fetch the event
      const event = yield* $(await deps.eventRepo.findById(input.eventId));

      if (!event) {
        return yield* $(Result.fail(eventError("EVENT_NOT_FOUND", "イベントが見つかりません")));
      }

      // Authorization check: global admin or event committee admin
      const resource = eventResource(input.eventId, event);
      yield* $(deps.authService.enforce(input.actor, resource, "event:activate"));

      // Check if event is already active
      if (event.status === "active") {
        return yield* $(
          Result.fail(eventError("EVENT_ALREADY_ACTIVE", "このイベントは既にアクティブです")),
        );
      }

      // Activate the event using domain logic
      const activatedEvent = activateEventLogic(event);

      // Save activated event to database
      yield* $(await deps.eventRepo.updateEvent(activatedEvent));

      return { eventId: input.eventId };
    }),
  );
}
