import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { createEventEntity } from "@/domain/event/logic";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for creating a new event
 */
export type CreateEventInput = {
  name: string;
  slug: string;
  actor: Actor;
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
export type CreateEventError = EventError | AuthorizationError;

/**
 * Create a new event
 *
 * Business rules:
 * - Only global admins can create events
 * - Slug must be unique across all events
 * - Event is created with "active" status
 *
 * @param deps - Dependencies (repositories, authService)
 * @param input - Event creation input
 * @returns Result with event ID or error
 */
export async function createEvent(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: CreateEventInput,
): Result.ResultAsync<CreateEventOutput, CreateEventError> {
  return gen(async function* ($) {
    // Authorization check: only global admins can create events
    // Note: event:create permission check only validates global admin role,
    // not the specific eventId, so we use an empty placeholder
    const placeholderResource = eventResource(cast<EventId>(""));
    yield* $(deps.authService.enforce(input.actor, placeholderResource, "event:create"));

    // Generate new event ID after authorization passes
    const eventId = generateId<EventId>();

    // Check if slug is already in use (domain service)
    yield* $(await deps.eventDomainService.ensureSlugUnique(input.slug));

    // Create event entity
    const event = yield* $(
      createEventEntity({
        id: eventId,
        name: input.name,
        slug: input.slug,
      }),
    );

    // Save event to database
    await deps.eventRepo.saveEvent(event);

    return { eventId };
  });
}
