/**
 * Archive event command
 * Archives an active event
 */

import { Result } from "@archive/result";
import type { EventId } from "@archive/domain/event/schema";
import type { EventError } from "@archive/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@archive/domain/event/errors";
import { archiveEvent as archiveEventLogic } from "@archive/domain/event/logic";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { EventRepository } from "@archive/domain/event/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";

export type ArchiveEventInput = {
  eventId: EventId;
  actor: Actor;
};

export type ArchiveEventOutput = {
  eventId: EventId;
};

export type ArchiveEventError = EventError | AuthorizationError;

export async function archiveEvent(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
  },
  input: ArchiveEventInput,
): Result.ResultAsync<ArchiveEventOutput, ArchiveEventError> {
  return Result.gen(async function* ($) {
    const event = await deps.eventRepo.findById(input.eventId);

    if (!event) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.EVENT_NOT_FOUND, "イベントが見つかりません")),
      );
    }

    const resource = eventResource(input.eventId, event);
    yield* $(deps.authService.enforce(input.actor, resource, "event:archive"));

    if (event.status === "archived") {
      return yield* $(
        Result.fail(
          eventError(EVENT_ERROR_CODE.EVENT_ARCHIVED, "このイベントは既にアーカイブされています"),
        ),
      );
    }

    const archivedEvent = yield* $(archiveEventLogic(event));

    await deps.eventRepo.saveEvent(archivedEvent);

    return { eventId: input.eventId };
  });
}
