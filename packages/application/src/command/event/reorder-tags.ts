/**
 * Reorder tags command
 * Reorders tags for an event
 */

import { Result } from "@akabase/result";
import type { EventId, TagId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";
import { DOMAIN_ERROR_CODE } from "@akabase/domain/shared/errors";

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

export async function reorderTags(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: ReorderTagsInput,
): Result.ResultAsync<ReorderTagsOutput, ReorderTagsError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingTags = await deps.eventRepo.findTags(input.eventId);
    const existingTagIds = new Set(existingTags.map((t) => t.id));

    const uniqueTagIds = new Set(input.tagIds);
    if (uniqueTagIds.size !== input.tagIds.length) {
      return yield* $(
        Result.fail(
          eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "重複したタグIDが含まれています"),
        ),
      );
    }

    for (const tagId of input.tagIds) {
      if (!existingTagIds.has(tagId)) {
        return yield* $(
          Result.fail(eventError(EVENT_ERROR_CODE.TAG_NOT_FOUND, "タグが見つかりません")),
        );
      }
    }

    if (input.tagIds.length !== existingTags.length) {
      return yield* $(
        Result.fail(
          eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "すべてのタグを指定してください"),
        ),
      );
    }

    await deps.eventRepo.updateTagDisplayOrders(
      input.eventId,
      input.tagIds.map((tagId, i) => ({ tagId, displayOrder: i })),
    );

    return { success: true as const, eventId: input.eventId };
  });
}
