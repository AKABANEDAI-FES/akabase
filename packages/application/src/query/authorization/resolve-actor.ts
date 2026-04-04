/**
 * Resolve an Actor from userId with permission context
 */

import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { UserId } from "@akabase/domain/user/schema";
import type {
  Actor,
  CommitteeRole,
  GlobalRole,
  OrgRole,
} from "@akabase/domain/authorization/schema";
import { createActor } from "@akabase/domain/authorization/logic";
import { globalRoleSchema, orgRoleSchema } from "@akabase/domain/authorization/schema";
import { QueryExceptionError } from "../shared";
import { cast } from "@akabase/domain/shared/ids";

export type ResolveActorOptions = {
  userId: UserId;
  eventIds?: EventId[];
};

export async function resolveActor(
  deps: { db: Database },
  options: ResolveActorOptions,
): Promise<Actor> {
  try {
    const eventIds = options.eventIds ?? [];

    const [userRow, committeeRows, orgRows] = await Promise.all([
      deps.db.query.user.findFirst({
        where: eq(schema.user.id, options.userId),
        columns: { role: true },
      }),
      eventIds.length > 0
        ? deps.db
            .select({
              eventId: schema.committeeRoles.eventId,
              role: schema.committeeRoles.role,
            })
            .from(schema.committeeRoles)
            .where(
              and(
                eq(schema.committeeRoles.userId, options.userId),
                inArray(schema.committeeRoles.eventId, eventIds),
              ),
            )
        : Promise.resolve([]),
      eventIds.length > 0
        ? deps.db
            .select({
              orgId: schema.orgMembers.orgId,
              role: schema.orgMembers.role,
            })
            .from(schema.orgMembers)
            .innerJoin(schema.organizations, eq(schema.orgMembers.orgId, schema.organizations.id))
            .where(
              and(
                eq(schema.orgMembers.userId, options.userId),
                inArray(schema.organizations.eventId, eventIds),
              ),
            )
        : Promise.resolve([]),
    ]);

    if (!userRow) {
      throw new QueryExceptionError(
        "ACTOR_RESOLUTION_FAILED",
        `ユーザー ${options.userId} が見つかりません`,
      );
    }

    const globalRole = globalRoleSchema.parse(userRow.role ?? "user");

    const committeeRolesMap = new Map<EventId, CommitteeRole>();
    for (const row of committeeRows) {
      committeeRolesMap.set(cast<EventId>(row.eventId), row.role);
    }
    const orgRolesMap = new Map<OrgId, OrgRole>();
    for (const row of orgRows) {
      orgRolesMap.set(cast<OrgId>(row.orgId), orgRoleSchema.parse(row.role));
    }

    return createActor(options.userId, globalRole, committeeRolesMap, orgRolesMap);
  } catch (error) {
    if (error instanceof QueryExceptionError) {
      throw error;
    }
    throw new QueryExceptionError("ACTOR_RESOLUTION_FAILED", `Actor の解決に失敗しました`, error);
  }
}

/**
 * Resolve actor from session (minimal - only userId and globalRole)
 */
export function resolveActorFromSession(userId: UserId, globalRole: GlobalRole): Actor {
  return createActor(userId, globalRole);
}
