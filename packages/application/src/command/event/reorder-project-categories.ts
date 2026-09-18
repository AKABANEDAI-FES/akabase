/**
 * Reorder project categories command
 * Reorders project categories for an event
 */

import { Result } from "@akabase/result";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";
import { DOMAIN_ERROR_CODE } from "@akabase/domain/shared/errors";

export type ReorderProjectCategoriesInput = {
  eventId: EventId;
  categoryIds: ProjectCategoryId[];
  actor: Actor;
};

export type ReorderProjectCategoriesOutput = {
  success: true;
  eventId: EventId;
};

export type ReorderProjectCategoriesError = EventError | AuthorizationError;

export async function reorderProjectCategories(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: ReorderProjectCategoriesInput,
): Result.ResultAsync<ReorderProjectCategoriesOutput, ReorderProjectCategoriesError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingCategories = await deps.eventRepo.findProjectCategories(input.eventId);
    const existingCategoryIds = new Set(existingCategories.map((c) => c.id));

    const uniqueCategoryIds = new Set(input.categoryIds);
    if (uniqueCategoryIds.size !== input.categoryIds.length) {
      return yield* $(
        Result.fail(
          eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "重複した企画区分IDが含まれています"),
        ),
      );
    }

    for (const categoryId of input.categoryIds) {
      if (!existingCategoryIds.has(categoryId)) {
        return yield* $(
          Result.fail(
            eventError(EVENT_ERROR_CODE.PROJECT_CATEGORY_NOT_FOUND, "企画区分が見つかりません"),
          ),
        );
      }
    }

    if (input.categoryIds.length !== existingCategories.length) {
      return yield* $(
        Result.fail(
          eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "すべての企画区分を指定してください"),
        ),
      );
    }

    await deps.eventRepo.updateProjectCategoryDisplayOrders(
      input.eventId,
      input.categoryIds.map((categoryId, i) => ({ categoryId, displayOrder: i })),
    );

    return { success: true as const, eventId: input.eventId };
  });
}
