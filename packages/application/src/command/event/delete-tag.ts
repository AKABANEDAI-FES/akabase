/**
 * Delete tag command
 * Deletes a tag (CASCADE removes tag associations)
 */

import { Result } from "@akabase/result";
import type { EventId, TagId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type DeleteTagInput = {
  tagId: TagId;
  eventId: EventId;
  actor: Actor;
};

export type DeleteTagOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteTagError = EventError | AuthorizationError;

export async function deleteTag(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: DeleteTagInput,
): Result.ResultAsync<DeleteTagOutput, DeleteTagError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    await deps.eventRepo.deleteTag(input.eventId, input.tagId);

    return { success: true as const, eventId: input.eventId };
  });
}
