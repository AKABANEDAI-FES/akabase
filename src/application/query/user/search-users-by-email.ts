import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { userIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { getCommitteeRoleForEvent } from "@/domain/authorization/logic";

/**
 * User search result DTO
 */
export const userSearchResultSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  email: z.string(),
});

export type UserSearchResult = z.infer<typeof userSearchResultSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * Search users by email
 *
 * Search mode is determined by the caller's committee role:
 * - admin/approver/member: prefix match (前方一致)
 * - default: exact match (完全一致)
 *
 * @param query - Email search query
 * @param actor - The actor performing the search
 * @param eventId - Event ID to determine committee role
 * @returns List of matching users (max 10)
 */
export async function searchUsersByEmail(
  query: string,
  actor: Actor,
  eventId: EventId,
): Promise<Result.Result<UserSearchResult[], QueryError>> {
  const committeeRole = getCommitteeRoleForEvent(actor, eventId);
  const condition =
    committeeRole === "default" ? eq(user.email, query) : like(user.email, `${query}%`);

  try {
    const rows = await db.query.user.findMany({
      where: condition,
      columns: {
        id: true,
        name: true,
        email: true,
      },
      limit: 10,
    });

    const users = rows.map((row) =>
      userSearchResultSchema.parse({
        id: row.id,
        name: row.name,
        email: row.email,
      }),
    );

    return Result.succeed(users);
  } catch (error) {
    console.error("[Query Error] Failed to search users", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "ユーザーの検索に失敗しました。",
    });
  }
}
