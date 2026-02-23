/**
 * Update committee role command
 * Assigns or updates a user's committee role for a specific event
 */

import type { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { Actor, CommitteeRole } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import type { UserError } from "@/domain/user/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import { eventResource } from "@/domain/authorization/logic";

export type UpdateCommitteeRoleInput = {
  userId: UserId;
  eventId: EventId;
  role: CommitteeRole;
  actor: Actor;
};

export type UpdateCommitteeRoleOutput = {
  success: true;
};

export type UpdateCommitteeRoleError = UserError | RepositoryError | AuthorizationError;

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
  deps: Pick<Dependencies, "userRepo" | "authService">,
  input: UpdateCommitteeRoleInput,
): Result.ResultAsync<UpdateCommitteeRoleOutput, UpdateCommitteeRoleError> {
  return suspend(() =>
    gen(async function* ($) {
      // Authorization check: event:update permission required
      // This allows both global admins and event admins to manage roles
      const resource = eventResource(input.eventId);
      yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

      // Persist the role assignment (UPSERT)
      yield* $(await deps.userRepo.upsertCommitteeRole(input.userId, input.eventId, input.role));

      return { success: true as const };
    }),
  );
}
