import { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import type { EventId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { canModifyEvent, updateEventEntity } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for updating an event
 */
export type UpdateEventInput = {
  eventId: EventId;
  name: string;
  slug: string;
  actor: Actor;
};

/**
 * Output of event update
 */
export type UpdateEventOutput = {
  eventId: EventId;
};

/**
 * Errors that can occur during event update
 */
export type UpdateEventError = EventError | RepositoryError | AuthorizationError;

/**
 * Update an existing event
 *
 * Business rules:
 * - Only global admins or event committee admins can update events
 * - Event must exist
 * - Archived events cannot be modified
 * - Slug must be unique (excluding the event itself)
 * - updatedAt is automatically updated
 *
 * @param deps - Dependencies (repositories, authService)
 * @param input - Event update input
 * @returns Result with event ID or error
 */
export async function updateEvent(
  deps: Pick<Dependencies, "eventRepo" | "authService">,
  input: UpdateEventInput,
): Result.ResultAsync<UpdateEventOutput, UpdateEventError> {
  return suspend(() =>
    gen(async function* ($) {
      // Fetch the event
      const event = yield* $(await deps.eventRepo.findById(input.eventId));

      if (!event) {
        return yield* $(Result.fail(eventError("EVENT_NOT_FOUND", "イベントが見つかりません")));
      }

      // Authorization check: global admin or event committee admin
      const resource = eventResource(input.eventId, event);
      yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

      // Check if event can be modified (not archived)
      yield* $(canModifyEvent(event));

      // Check if slug is unique (exclude current event)
      const existingEvent = yield* $(await deps.eventRepo.findBySlug(input.slug));

      if (existingEvent && existingEvent.id !== input.eventId) {
        return yield* $(
          Result.fail(
            eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "このスラッグは既に使用されています"),
          ),
        );
      }

      // Update event entity
      const updatedEvent = updateEventEntity(event, {
        name: input.name,
        slug: input.slug,
      });

      // Save updated event to database
      yield* $(await deps.eventRepo.saveEvent(updatedEvent));

      return { eventId: input.eventId };
    }),
  );
}
