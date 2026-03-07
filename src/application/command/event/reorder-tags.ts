import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, TagId } from "@/domain/shared/ids";
import type { EventError } from "@/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";
import { DOMAIN_ERROR_CODE } from "@/domain/shared/errors";

/**
 * Reorder tags input
 */
export type ReorderTagsInput = {
  eventId: EventId;
  tagIds: TagId[];
  actor: Actor;
};

export type ReorderTagsOutput = {
  success: true;
  eventId: EventId;
};

export type ReorderTagsError = EventError | AuthorizationError;

/**
 * Reorder tags for an event
 *
 * Business rules:
 * - Only Event Committee Admin can manage tags
 * - Event must not be archived
 * - All provided tagIds must belong to the event
 */
export async function reorderTags(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: ReorderTagsInput,
): Result.ResultAsync<ReorderTagsOutput, ReorderTagsError> {
  return gen(async function* ($) {
    // Authorization check
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Fetch existing tags
    const existingTags = await deps.eventRepo.findTags(input.eventId);
    const existingTagIds = new Set(existingTags.map((t) => t.id));

    // Validate no duplicate tagIds
    const uniqueTagIds = new Set(input.tagIds);
    if (uniqueTagIds.size !== input.tagIds.length) {
      return yield* $(
        Result.fail(
          eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "重複したタグIDが含まれています"),
        ),
      );
    }

    // Validate all tagIds belong to the event
    for (const tagId of input.tagIds) {
      if (!existingTagIds.has(tagId)) {
        return yield* $(
          Result.fail(eventError(EVENT_ERROR_CODE.TAG_NOT_FOUND, "タグが見つかりません")),
        );
      }
    }

    // Validate all existing tags are included
    if (input.tagIds.length !== existingTags.length) {
      return yield* $(
        Result.fail(
          eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "すべてのタグを指定してください"),
        ),
      );
    }

    // Update displayOrder for each tag atomically
    await deps.eventRepo.updateTagDisplayOrders(
      input.eventId,
      input.tagIds.map((tagId, i) => ({ tagId, displayOrder: i })),
    );

    return { success: true as const, eventId: input.eventId };
  });
}
