/**
 * Update committee role command
 * Assigns or updates a user's committee role for a specific event
 */

import { Result } from "@akabase/result";
import type { UserId } from "@akabase/domain/user/schema";
import type { EventId } from "@akabase/domain/event/schema";
import type { Actor, CommitteeRole } from "@akabase/domain/authorization/schema";
import type { UserError } from "@akabase/domain/user/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { UserRepository } from "@akabase/domain/user/repository";
import { eventResource } from "@akabase/domain/authorization/logic";
import { generateId } from "@akabase/domain/shared/ids";
import {
  createCommitteeRoleAssignment,
  updateCommitteeRoleAssignment,
} from "@akabase/domain/user/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type UpdateCommitteeRoleInput = {
  userId: UserId;
  eventId: EventId;
  role: CommitteeRole;
  actor: Actor;
};

export type UpdateCommitteeRoleOutput = {
  eventId: EventId;
  success: true;
};

export type UpdateCommitteeRoleError = UserError | EventError | AuthorizationError;

/**
 * Update (or create) a committee role assignment
 *
 * Business rules:
 * - Only global admins and event admins can manage committee roles
 * - Event admins can only manage roles for their own events
 * - Uses UPSERT: updates existing role or creates new one
 *
 * @param deps - Dependencies (repositories, authService)
 * @param input - Committee role update input
 * @returns Success or error
 */
export async function updateCommitteeRole(
  deps: {
    userRepo: UserRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdateCommitteeRoleInput,
): Result.ResultAsync<UpdateCommitteeRoleOutput, UpdateCommitteeRoleError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingAssignment = await deps.userRepo.findCommitteeRoleAssignment(
      input.userId,
      input.eventId,
    );

    const assignment = existingAssignment
      ? updateCommitteeRoleAssignment(existingAssignment, input.role)
      : createCommitteeRoleAssignment(generateId(), input.eventId, input.userId, input.role);

    await deps.userRepo.saveCommitteeRoleAssignment(assignment);

    return { eventId: assignment.eventId, success: true as const };
  });
}
