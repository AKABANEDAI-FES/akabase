import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, TagId } from "@/domain/shared/ids";
import type { Tag } from "@/domain/event/schema";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { canModifyEvent } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
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

export type CreateTagError = EventError | RepositoryError | AuthorizationError;

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
    const event = yield* $(await deps.eventRepo.findById(input.eventId));
    if (!event) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.EVENT_NOT_FOUND, "イベントが見つかりません")),
      );
    }
    yield* $(canModifyEvent(event));

    // Check tag name uniqueness within event
    yield* $(await deps.eventDomainService.ensureTagNameUnique(input.eventId, input.name));

    // Create tag entity
    const tagId = generateId<TagId>();
    const tag: Tag = {
      id: tagId,
      eventId: input.eventId,
      name: input.name,
      createdAt: new Date(),
    };

    // Save tag
    yield* $(await deps.eventRepo.saveTag(tag));

    return { tagId, eventId: input.eventId };
  });
}
