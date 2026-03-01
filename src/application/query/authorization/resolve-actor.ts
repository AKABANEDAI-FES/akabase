/**
 * Resolve an Actor from userId with permission context
 */

import { committeeRoles, orgMembers, organizations, user } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import type { Dependencies } from "@/infrastructure/di";
import type { Actor, CommitteeRole, GlobalRole, OrgRole } from "@/domain/authorization/schema";
import { createActor } from "@/domain/authorization/logic";
import { globalRoleSchema } from "@/domain/authorization/schema";
import { QueryException } from "../shared";

/**
 * Options for actor resolution
 */
export type ResolveActorOptions = {
  userId: UserId;

  // Pre-load specific event permissions
  eventIds?: EventId[];
};

/**
 * Resolve an Actor from userId with permission context
 *
 * Strategy:
 * - Always includes userId and globalRole (fetched from database)
 * - Optionally pre-loads committee roles for specific events
 * - Optionally pre-loads org roles for organizations in specified events
 *
 * @param options - Actor resolution options
 * @returns Actor instance with loaded permissions
 * @throws {QueryException} When actor resolution fails
 */
export async function resolveActor(
  deps: Pick<Dependencies, "db">,
  options: ResolveActorOptions,
): Promise<Actor> {
  try {
    const hasEventIds = options.eventIds && options.eventIds.length > 0;

    // Run all queries in parallel
    const [userRow, committeeRows, orgRows] = await Promise.all([
      deps.db.query.user.findFirst({
        where: eq(user.id, options.userId),
        columns: { role: true },
      }),
      hasEventIds
        ? deps.db
            .select({ eventId: committeeRoles.eventId, role: committeeRoles.role })
            .from(committeeRoles)
            .where(
              and(
                eq(committeeRoles.userId, options.userId),
                inArray(committeeRoles.eventId, options.eventIds!),
              ),
            )
        : Promise.resolve([]),
      hasEventIds
        ? deps.db
            .select({ orgId: orgMembers.orgId, role: orgMembers.role })
            .from(orgMembers)
            .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
            .where(
              and(
                eq(orgMembers.userId, options.userId),
                inArray(organizations.eventId, options.eventIds!),
              ),
            )
        : Promise.resolve([]),
    ]);

    if (!userRow) {
      throw new QueryException(
        "ACTOR_RESOLUTION_FAILED",
        `ユーザー ${options.userId} が見つかりません`,
      );
    }

    const globalRole = globalRoleSchema.parse(userRow.role ?? "user");

    const committeeRolesMap = new Map<EventId, CommitteeRole>(
      committeeRows.map((row) => [row.eventId as EventId, row.role as CommitteeRole]),
    );
    const orgRolesMap = new Map<OrgId, OrgRole>(
      orgRows.map((row) => [row.orgId as OrgId, row.role as OrgRole]),
    );

    return createActor(options.userId, globalRole, committeeRolesMap, orgRolesMap);
  } catch (error) {
    if (error instanceof QueryException) {
      throw error;
    }
    throw new QueryException(
      "ACTOR_RESOLUTION_FAILED",
      `Actor の解決に失敗しました: ${error}`,
      error,
    );
  }
}

/**
 * Resolve actor from session (minimal - only userId and globalRole)
 * Use this when you don't need to check permissions immediately
 *
 * @param userId - User ID
 * @param globalRole - Global role
 * @returns Actor instance with minimal context
 */
export function resolveActorFromSession(userId: UserId, globalRole: GlobalRole): Actor {
  return createActor(userId, globalRole);
}
