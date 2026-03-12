/**
 * Update global role command
 * Updates a user's global role (admin or user)
 */

import { Result } from "@archive/result";
import type { UserId } from "@archive/domain/user/schema";
import type { Actor, GlobalRole } from "@archive/domain/authorization/schema";
import type { UserError } from "@archive/domain/user/errors";
import { userError } from "@archive/domain/user/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import { userResource } from "@archive/domain/authorization/logic";
import { updateUserGlobalRole } from "@archive/domain/user/logic";
import type { UserRepository } from "@archive/domain/user/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";

export type UpdateGlobalRoleInput = {
  userId: UserId;
  role: GlobalRole;
  actor: Actor;
};

export type UpdateGlobalRoleOutput = {
  success: true;
};

export type UpdateGlobalRoleError = UserError | AuthorizationError;

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
  deps: {
    userRepo: UserRepository;
    authService: AuthorizationService;
  },
  input: UpdateGlobalRoleInput,
): Result.ResultAsync<UpdateGlobalRoleOutput, UpdateGlobalRoleError> {
  return Result.gen(async function* ($) {
    const resource = userResource(input.userId);
    yield* $(deps.authService.enforce(input.actor, resource, "user:update_role"));

    const user = await deps.userRepo.findById(input.userId);
    if (!user) {
      return yield* $(Result.fail(userError("USER_NOT_FOUND", "ユーザーが見つかりません")));
    }

    const updatedUser = updateUserGlobalRole(user, input.role);

    await deps.userRepo.saveUser(updatedUser);

    return { success: true as const };
  });
}
