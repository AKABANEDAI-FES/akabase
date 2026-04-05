/**
 * List users for event query
 * Returns all users with their committee role in the specified event
 */

import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { Result } from "@akabase/result";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { userIdSchema } from "@akabase/domain/user/schema";
import { committeeRoleSchema } from "@akabase/domain/authorization/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const userForEventSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  email: z.string(),
  role: committeeRoleSchema,
  createdAt: z.date(),
});

export type UserForEvent = z.infer<typeof userForEventSchema>;

export async function listUsersForEvent(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  actor: Actor,
): Promise<UserForEvent[]> {
  const authResult = deps.authService.enforce(actor, eventResource(eventId), "user:list_for_event");
  if (Result.isFailure(authResult)) {
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.committeeRoles.role,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .leftJoin(
        schema.committeeRoles,
        and(
          eq(schema.user.id, schema.committeeRoles.userId),
          eq(schema.committeeRoles.eventId, eventId),
        ),
      )
      .orderBy(desc(schema.user.createdAt));

    return rows.map((row) =>
      userForEventSchema.parse({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role ?? "default",
        createdAt: row.createdAt,
      }),
    );
  } catch (error) {
    throw new QueryExceptionError(
      "DATABASE_ERROR",
      "イベントのユーザー一覧の取得に失敗しました。",
      error,
    );
  }
}
