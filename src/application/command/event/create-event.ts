import { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { Event } from "@/domain/event/schema";
import type { EventError } from "@/domain/event/errors";
import { eventError } from "@/domain/event/errors";
import type { RepositoryError } from "@/infrastructure/repositories/interfaces";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for creating a new event
 */
export type CreateEventInput = {
  name: string;
  slug: string;
  userId: UserId;
};

/**
 * Output of event creation
 */
export type CreateEventOutput = {
  eventId: EventId;
};

/**
 * Errors that can occur during event creation
 */
export type CreateEventError = EventError | RepositoryError;

/**
 * Create a new event
 *
 * Business rules:
 * - Slug must be unique across all events
 * - Event is created with "active" status
 *
 * @param deps - Dependencies (repositories)
 * @param input - Event creation input
 * @returns Result with event ID or error
 */
export async function createEvent(
  deps: Pick<Dependencies, "eventRepo">,
  input: CreateEventInput,
): Result.ResultAsync<CreateEventOutput, CreateEventError> {
  return suspend(() =>
    gen(async function* ($) {
      // Check if slug is already in use
      const existingEvent = yield* $(await deps.eventRepo.findBySlug(input.slug));

      if (existingEvent) {
        return yield* $(
          Result.fail(eventError("SLUG_NOT_UNIQUE", "このスラッグは既に使用されています")),
        );
      }

      // Generate new event ID
      const eventId = generateId<EventId>();

      // Create event entity
      const now = new Date();
      const event: Event = {
        id: eventId,
        name: input.name,
        slug: input.slug,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      // Save event to database
      yield* $(await deps.eventRepo.saveEvent(event));

      return { eventId };
    }),
  );
}
