/**
 * Create project category command
 * Creates a new project category for an event
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { createProjectCategoryEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type CreateProjectCategoryInput = {
  eventId: EventId;
  name: string;
  actor: Actor;
};

export type CreateProjectCategoryOutput = {
  categoryId: ProjectCategoryId;
  eventId: EventId;
};

export type CreateProjectCategoryError = EventError | AuthorizationError;

export async function createProjectCategory(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: CreateProjectCategoryInput,
): Result.ResultAsync<CreateProjectCategoryOutput, CreateProjectCategoryError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const name = input.name.trim();

    yield* $(await deps.eventDomainService.ensureProjectCategoryNameUnique(input.eventId, name));

    const maxDisplayOrder = await deps.eventRepo.getMaxProjectCategoryDisplayOrder(input.eventId);

    const categoryId = generateId<ProjectCategoryId>();
    const category = yield* $(
      createProjectCategoryEntity({
        id: categoryId,
        eventId: input.eventId,
        name,
        displayOrder: maxDisplayOrder + 1,
      }),
    );

    await deps.eventRepo.saveProjectCategory(category);

    return { categoryId, eventId: input.eventId };
  });
}
