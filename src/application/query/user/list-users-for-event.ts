/**
 * List users for a specific event with their committee roles
 * Returns all users with their role in the specified event (or "default" if not set)
 */

import { z } from "zod";
import { db } from "@/db";
import { committeeRoles, user } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { userIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import { committeeRoleSchema } from "@/domain/authorization/schema";
import type { Actor } from "@/domain/authorization/schema";
import { getCommitteeRoleForEvent, isGlobalAdmin } from "@/domain/authorization/logic";
import { QueryException } from "../shared";

// DTO schema for user in event context
export const userForEventSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  email: z.string(),
  role: committeeRoleSchema, // Committee role in this event (or "default")
  createdAt: z.date(),
});

export type UserForEvent = z.infer<typeof userForEventSchema>;

/**
 * List all users with their committee role in the specified event
 * Users without an explicit role are assigned "default"
 *
 * Authorization: Only global admins and committee admin/approver/member can access
 *
 * @throws {QueryException} When database operation fails or permission denied
 */
export async function listUsersForEvent(eventId: EventId, actor: Actor): Promise<UserForEvent[]> {
  const committeeRole = getCommitteeRoleForEvent(actor, eventId);
  if (!isGlobalAdmin(actor) && !["admin", "approver", "member"].includes(committeeRole)) {
    throw new QueryException("VALIDATION_ERROR", "ユーザー一覧を閲覧する権限がありません。");
  }

  try {
    // Get all users with their committee role for this event in a single query
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: committeeRoles.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(
        committeeRoles,
        and(eq(user.id, committeeRoles.userId), eq(committeeRoles.eventId, eventId)),
      )
      .orderBy(desc(user.createdAt));

    // Map to DTO, using "default" for users without an assigned role
    const usersForEvent = rows.map((row) => {
      return userForEventSchema.parse({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role ?? "default",
        createdAt: row.createdAt,
      });
    });

    return usersForEvent;
  } catch (error) {
    throw new QueryException(
      "DATABASE_ERROR",
      "イベントのユーザー一覧の取得に失敗しました。",
      error,
    );
  }
}
