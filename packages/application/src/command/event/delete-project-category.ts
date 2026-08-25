/**
 * Delete project category command
 * Deletes a project category (projects referencing it become uncategorized)
 */

import { Result } from "@akabase/result";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type DeleteProjectCategoryInput = {
  categoryId: ProjectCategoryId;
  eventId: EventId;
  actor: Actor;
};

export type DeleteProjectCategoryOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteProjectCategoryError = EventError | AuthorizationError;

export async function deleteProjectCategory(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: DeleteProjectCategoryInput,
): Result.ResultAsync<DeleteProjectCategoryOutput, DeleteProjectCategoryError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    await deps.eventRepo.deleteProjectCategory(input.eventId, input.categoryId);

    return { success: true as const, eventId: input.eventId };
  });
}
