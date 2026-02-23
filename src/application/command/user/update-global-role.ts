/**
 * Update global role command
 * Updates a user's global role (admin or user)
 */

import type { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import type { UserId } from "@/domain/shared/ids";
import type { Actor, GlobalRole } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import type { UserError } from "@/domain/user/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import { userResource } from "@/domain/authorization/logic";

export type UpdateGlobalRoleInput = {
  userId: UserId;
  role: GlobalRole;
  actor: Actor;
};

export type UpdateGlobalRoleOutput = {
  success: true;
};

export type UpdateGlobalRoleError = UserError | RepositoryError | AuthorizationError;

/**
 * Update a user's global role
 *
 * Business rules:
 * - Only global admins can update global roles
 * - Uses authorization service for permission check
 *
 * @param deps - Dependencies (repositories, authService)
 * @param input - Global role update input
 * @returns Success or error
 */
export async function updateGlobalRole(
  deps: Pick<Dependencies, "userRepo" | "authService">,
  input: UpdateGlobalRoleInput,
): Result.ResultAsync<UpdateGlobalRoleOutput, UpdateGlobalRoleError> {
  return suspend(() =>
    gen(async function* ($) {
      // Authorization check: user:update_role permission required
      // This allows only global admins to update user roles
      const resource = userResource(input.userId);
      yield* $(deps.authService.enforce(input.actor, resource, "user:update_role"));

      // Persist the role update
      yield* $(await deps.userRepo.updateGlobalRole(input.userId, input.role));

      return { success: true as const };
    }),
  );
}
