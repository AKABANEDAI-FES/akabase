import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { eventError } from "@/domain/event/errors";
import { archiveEvent as archiveEventLogic } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for archiving an event
 */
export type ArchiveEventInput = {
  eventId: EventId;
  actor: Actor;
};

/**
 * Output of event archival
 */
export type ArchiveEventOutput = {
  eventId: EventId;
};

/**
 * Errors that can occur during event archival
 */
export type ArchiveEventError = EventError | RepositoryError | AuthorizationError;

/**
 * Archive an event
 *
 * Business rules:
 * - Only global admins or event committee admins can archive events
 * - Event must exist
 * - Event must not be already archived
 * - Status changes to "archived"
 * - Archived events become read-only
 *
 * @param deps - Dependencies (repositories, authService)
 * @param input - Event archive input
 * @returns Result with event ID or error
 */
export async function archiveEvent(
  deps: Pick<Dependencies, "eventRepo" | "authService">,
  input: ArchiveEventInput,
): Result.ResultAsync<ArchiveEventOutput, ArchiveEventError> {
  return gen(async function* ($) {
    // Fetch the event
    const event = yield* $(await deps.eventRepo.findById(input.eventId));

    if (!event) {
      return yield* $(Result.fail(eventError("EVENT_NOT_FOUND", "イベントが見つかりません")));
    }

    // Authorization check: global admin or event committee admin
    const resource = eventResource(input.eventId, event);
    yield* $(deps.authService.enforce(input.actor, resource, "event:archive"));

    // Check if event is already archived
    if (event.status === "archived") {
      return yield* $(
        Result.fail(eventError("EVENT_ARCHIVED", "このイベントは既にアーカイブされています")),
      );
    }

    // Archive the event using domain logic
    const archivedEvent = archiveEventLogic(event);

    // Save archived event to database
    yield* $(await deps.eventRepo.saveEvent(archivedEvent));

    return { eventId: input.eventId };
  });
}
