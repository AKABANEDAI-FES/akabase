/**
 * List users with roles query
 * Retrieves all users with their basic information and global role
 */

import { z } from "zod";
import { Result } from "@akabase/result";
import type { Database } from "@akabase/infrastructure/db";
import { globalRoleSchema } from "@akabase/domain/authorization/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { userResource } from "@akabase/domain/authorization/logic";
import { userIdSchema } from "@akabase/domain/user/schema";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const userListItemSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  email: z.string(),
  globalRole: globalRoleSchema,
  createdAt: z.date(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

export async function listUsersWithRoles(
  deps: { db: Database; authService: AuthorizationService },
  actor: Actor,
): Promise<UserListItem[]> {
  const authResult = deps.authService.enforce(actor, userResource(actor.userId), "user:list");
  if (Result.isFailure(authResult)) {
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
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

    return users.map((u) =>
      userListItemSchema.parse({
        id: u.id,
        name: u.name,
        email: u.email,
        globalRole: u.role ?? undefined,
        createdAt: new Date(u.createdAt),
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "ユーザー一覧の取得に失敗しました。", error);
  }
}
