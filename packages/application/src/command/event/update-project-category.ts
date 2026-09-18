/**
 * Update project category command
 * Updates an existing project category's name
 */

import { Result } from "@akabase/result";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import { updateProjectCategoryEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type UpdateProjectCategoryInput = {
  categoryId: ProjectCategoryId;
  eventId: EventId;
  name: string;
  actor: Actor;
};

export type UpdateProjectCategoryOutput = {
  success: true;
  eventId: EventId;
};

export type UpdateProjectCategoryError = EventError | AuthorizationError;

export async function updateProjectCategory(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdateProjectCategoryInput,
): Result.ResultAsync<UpdateProjectCategoryOutput, UpdateProjectCategoryError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingCategories = await deps.eventRepo.findProjectCategories(input.eventId);
    const existingCategory = existingCategories.find((c) => c.id === input.categoryId);

    if (!existingCategory) {
      return yield* $(
        Result.fail(
          eventError(EVENT_ERROR_CODE.PROJECT_CATEGORY_NOT_FOUND, "企画区分が見つかりません"),
        ),
      );
    }

    const name = input.name.trim();

    yield* $(
      await deps.eventDomainService.ensureProjectCategoryNameUnique(
        input.eventId,
        name,
        input.categoryId,
      ),
    );

    const updatedCategory = yield* $(updateProjectCategoryEntity(existingCategory, { name }));

    await deps.eventRepo.saveProjectCategory(updatedCategory);

    return { success: true as const, eventId: input.eventId };
  });
}
