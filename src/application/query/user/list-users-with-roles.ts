/**
 * List users query
 * Retrieves all users with their basic information and global role
 */

import { z } from "zod";
import { globalRoleSchema } from "@/domain/authorization/schema";
import type { Actor } from "@/domain/authorization/schema";
import { userResource } from "@/domain/authorization/logic";
import { userIdSchema } from "@/domain/shared/ids";
import { QueryException } from "../shared";
import type { Dependencies } from "@/infrastructure/di";
import { Result } from "@praha/byethrow";

/**
 * User list item DTO
 */
export const userListItemSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  email: z.string(),
  globalRole: globalRoleSchema,
  createdAt: z.date(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

/**
 * List all users
 *
 * Authorization: Only global admins can access
 *
 * Strategy:
 * - Check if actor is a global admin
 * - Fetch all users from the user table ordered by creation date
 * - Map to DTO with basic user information and global role
 *
 * @param deps - Dependencies (authService)
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of users or query error
 * @throws {QueryException} When database operation fails or permission denied
 */
export async function listUsersWithRoles(
  deps: Pick<Dependencies, "db" | "authService">,
  actor: Actor,
): Promise<UserListItem[]> {
  // Authorization check: user:list permission
  const authResult = deps.authService.enforce(actor, userResource(actor.userId), "user:list");
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    // Fetch all users
    const users = await deps.db.query.user.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: (user, { desc }) => [desc(user.createdAt)],
    });

    // Map to DTO
    const userList: UserListItem[] = users.map((u) =>
      userListItemSchema.parse({
        id: u.id,
        name: u.name,
        email: u.email,
        globalRole: u.role ?? undefined,
        createdAt: new Date(u.createdAt),
      }),
    );

    return userList;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "ユーザー一覧の取得に失敗しました。", error);
  }
}
