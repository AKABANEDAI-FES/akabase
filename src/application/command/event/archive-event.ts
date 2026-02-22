import { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { eventError } from "@/domain/event/errors";
import { archiveEvent as archiveEventLogic } from "@/domain/event/logic";
import type { RepositoryError } from "@/infrastructure/repositories/interfaces";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for archiving an event
 */
export type ArchiveEventInput = {
  eventId: EventId;
  userId: UserId;
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
export type ArchiveEventError = EventError | RepositoryError;

/**
 * Archive an event
 *
 * Business rules:
 * - Event must exist
 * - Event must not be already archived
 * - Status changes to "archived"
 * - Archived events become read-only
 *
 * @param deps - Dependencies (repositories)
 * @param input - Event archive input
 * @returns Result with event ID or error
 */
export async function archiveEvent(
  deps: Pick<Dependencies, "eventRepo">,
  input: ArchiveEventInput,
): Result.ResultAsync<ArchiveEventOutput, ArchiveEventError> {
  return suspend(() =>
    gen(async function* ($) {
      // Fetch the event
      const event = yield* $(await deps.eventRepo.findById(input.eventId));

      if (!event) {
        return yield* $(Result.fail(eventError("EVENT_NOT_FOUND", "イベントが見つかりません")));
      }

      // Check if event is already archived
      if (event.status === "archived") {
        return yield* $(
          Result.fail(eventError("EVENT_ARCHIVED", "このイベントは既にアーカイブされています")),
        );
      }

      // Archive the event using domain logic
      const archivedEvent = archiveEventLogic(event);

      // Save archived event to database
      yield* $(await deps.eventRepo.updateEvent(archivedEvent));

      return { eventId: input.eventId };
    }),
  );
}
