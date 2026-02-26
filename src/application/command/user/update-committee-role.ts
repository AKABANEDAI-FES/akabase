/**
 * Update committee role command
 * Assigns or updates a user's committee role for a specific event
 */

import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { Actor, CommitteeRole } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import type { UserError } from "@/domain/user/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import { eventResource } from "@/domain/authorization/logic";
import { generateId } from "@/libs/id";
import { createCommitteeRoleAssignment, updateCommitteeRoleAssignment } from "@/domain/user/logic";

export type UpdateCommitteeRoleInput = {
  userId: UserId;
  eventId: EventId;
  role: CommitteeRole;
  actor: Actor;
};

export type UpdateCommitteeRoleOutput = {
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
  deps: Pick<Dependencies, "userRepo" | "authService" | "eventDomainService">,
  input: UpdateCommitteeRoleInput,
): Result.ResultAsync<UpdateCommitteeRoleOutput, UpdateCommitteeRoleError> {
  return gen(async function* ($) {
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

    return { success: true as const };
  });
}
