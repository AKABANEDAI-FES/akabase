import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { userIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource, getCommitteeRoleForEvent } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import type { Dependencies } from "@/infrastructure/di";
import { Result } from "@praha/byethrow";

/**
 * User search result DTO
 */
export const userSearchResultSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  email: z.string(),
});

export type UserSearchResult = z.infer<typeof userSearchResultSchema>;

/**
 * Search users by email
 *
 * Search mode is determined by the caller's committee role:
 * - admin/approver/member: prefix match (前方一致)
 * - default: exact match (完全一致)
 *
 * @param deps - Dependencies (authService)
 * @param query - Email search query
 * @param actor - The actor performing the search
 * @param eventId - Event ID to determine committee role
 * @returns List of matching users (max 10)
 * @throws {QueryException} When database operation fails
 */
export async function searchUsersByEmail(
  deps: Pick<Dependencies, "authService">,
  query: string,
  actor: Actor,
  eventId: EventId,
): Promise<UserSearchResult[]> {
  // Authorization check: user:search permission
  const authResult = deps.authService.enforce(actor, eventResource(eventId), "user:search");
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  // Feature logic: Determine search mode based on committee role
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

    return users;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "ユーザーの検索に失敗しました。", error);
  }
}
