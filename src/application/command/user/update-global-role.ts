/**
 * Update global role command
 * Updates a user's global role (admin or user)
 */

import { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import type { UserId } from "@/domain/shared/ids";
import type { Actor, GlobalRole } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import type { UserError } from "@/domain/user/errors";
import { userError } from "@/domain/user/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import { userResource } from "@/domain/authorization/logic";
import { updateUserGlobalRole } from "@/domain/user/logic";

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
      const resource = userResource(input.userId);
      yield* $(deps.authService.enforce(input.actor, resource, "user:update_role"));

      const user = yield* $(await deps.userRepo.findById(input.userId));
      if (!user) {
        return yield* $(Result.fail(userError("USER_NOT_FOUND", "ユーザーが見つかりません")));
      }

      const updatedUser = updateUserGlobalRole(user, input.role);

      yield* $(await deps.userRepo.updateUser(updatedUser));

      return { success: true as const };
    }),
  );
}
