/**
 * List users query
 * Retrieves all users with their basic information and global role
 */

import { z } from "zod";
import { db } from "@/db";
import { globalRoleSchema } from "@/domain/authorization/schema";
import type { Actor } from "@/domain/authorization/schema";
import { isGlobalAdmin } from "@/domain/authorization/logic";
import { userIdSchema } from "@/domain/shared/ids";
import { QueryException } from "../shared";

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
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of users or query error
 * @throws {QueryException} When database operation fails or permission denied
 */
export async function listUsersWithRoles(actor: Actor): Promise<UserListItem[]> {
  // Authorization check: only global admins can list all users
  if (!isGlobalAdmin(actor)) {
    throw new QueryException(
      "VALIDATION_ERROR",
      "ユーザー一覧を閲覧する権限がありません。グローバル管理者のみアクセス可能です。",
    );
  }

  try {
    // Fetch all users
    const users = await db.query.user.findMany({
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
