/**
 * List users query
 * Retrieves all users with their basic information and global role
 */

import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { globalRoleSchema } from "@/domain/authorization/schema";

/**
 * User list item DTO
 */
export const userListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  globalRole: globalRoleSchema,
  createdAt: z.date(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * List all users
 *
 * Strategy:
 * - Fetch all users from the user table ordered by creation date
 * - Map to DTO with basic user information and global role
 *
 * @returns List of users or query error
 */
export async function listUsersWithRoles(): Promise<Result.Result<UserListItem[], QueryError>> {
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

    return Result.succeed(userList);
  } catch (error) {
    console.error("[Query Error] Failed to list users", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "ユーザー一覧の取得に失敗しました。",
    });
  }
}
