import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, TagId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { createTagEntity } from "@/domain/event/logic";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Create tag input
 */
export type CreateTagInput = {
  eventId: EventId;
  name: string;
  actor: Actor;
};

export type CreateTagOutput = {
  tagId: TagId;
  eventId: EventId;
};

export type CreateTagError = EventError | AuthorizationError;

/**
 * Create a new tag for an event
 *
 * Business rules:
 * - Only Event Committee Admin can manage tags
 * - Event must not be archived
 * - Name must be unique within the event (enforced by database constraint)
 */
export async function createTag(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: CreateTagInput,
): Result.ResultAsync<CreateTagOutput, CreateTagError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Check tag name uniqueness within event
    yield* $(await deps.eventDomainService.ensureTagNameUnique(input.eventId, input.name));

    // Create tag entity
    const tagId = generateId<TagId>();
    const tag = yield* $(
      createTagEntity({
        id: tagId,
        eventId: input.eventId,
        name: input.name,
      }),
    );

    // Save tag
    await deps.eventRepo.saveTag(tag);

    return { tagId, eventId: input.eventId };
  });
}
