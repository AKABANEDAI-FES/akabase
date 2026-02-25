import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, TagId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import { updateTagEntity } from "@/domain/event/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Update tag input
 */
export type UpdateTagInput = {
  tagId: TagId;
  eventId: EventId;
  name: string;
  actor: Actor;
};

export type UpdateTagOutput = {
  success: true;
  eventId: EventId;
};

export type UpdateTagError = EventError | RepositoryError | AuthorizationError;

/**
 * Update an existing tag
 */
export async function updateTag(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: UpdateTagInput,
): Result.ResultAsync<UpdateTagOutput, UpdateTagError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Find existing tag
    const existingTags = yield* $(await deps.eventRepo.findTags(input.eventId));
    const existingTag = existingTags.find((t) => t.id === input.tagId);

    if (!existingTag) {
      return yield* $(
        Result.fail(eventError(EVENT_ERROR_CODE.TAG_NOT_FOUND, "タグが見つかりません")),
      );
    }

    // Check tag name uniqueness within event (exclude self)
    yield* $(
      await deps.eventDomainService.ensureTagNameUnique(input.eventId, input.name, input.tagId),
    );

    // Update tag using domain logic (only mutable fields)
    const updatedTag = yield* $(updateTagEntity(existingTag, { name: input.name }));

    // Save tag
    yield* $(await deps.eventRepo.saveTag(updatedTag));

    return { success: true as const, eventId: input.eventId };
  });
}
