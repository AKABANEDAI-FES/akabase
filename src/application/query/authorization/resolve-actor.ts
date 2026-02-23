/**
 * Resolve an Actor from userId with permission context
 */

import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { committeeRoles, orgMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import { createActor } from "@/domain/authorization/actor";
import type { Actor, CommitteeRole, GlobalRole, OrgRole } from "@/domain/authorization/actor";

/**
 * Query error type
 */
export type QueryError = {
  code: "ACTOR_RESOLUTION_FAILED";
  message: string;
};

/**
 * Options for actor resolution
 */
export type ResolveActorOptions = {
  userId: UserId;
  globalRole?: GlobalRole;

  // Pre-load specific event permissions
  eventIds?: EventId[];

  // Pre-load specific organization permissions
  orgIds?: OrgId[];

  // Load all permissions (expensive, use sparingly)
  loadAll?: boolean;
};

/**
 * Resolve an Actor from userId with permission context
 *
 * Strategy:
 * - Always includes userId and globalRole (from session)
 * - Optionally pre-loads committee roles for specific events
 * - Optionally pre-loads org roles for specific organizations
 * - Lazy loading can be implemented later if needed
 *
 * @param options - Actor resolution options
 * @returns Actor instance with loaded permissions
 */
export async function resolveActor(
  options: ResolveActorOptions,
): Promise<Result.Result<Actor, QueryError>> {
  try {
    const committeeRolesMap = new Map<EventId, CommitteeRole>();
    const orgRolesMap = new Map<OrgId, OrgRole>();

    // Load committee roles for specific events or all events
    if (options.loadAll || (options.eventIds && options.eventIds.length > 0)) {
      const committeeRows = await db
        .select({
          eventId: committeeRoles.eventId,
          role: committeeRoles.role,
        })
        .from(committeeRoles)
        .where(eq(committeeRoles.userId, options.userId))
        .all();

      for (const row of committeeRows) {
        // Filter by eventIds if provided and not loadAll
        if (options.loadAll || options.eventIds?.includes(row.eventId as EventId)) {
          committeeRolesMap.set(row.eventId as EventId, row.role as CommitteeRole);
        }
      }
    }

    // Load org roles for specific organizations or all organizations
    if (options.loadAll || (options.orgIds && options.orgIds.length > 0)) {
      const orgRows = await db
        .select({
          orgId: orgMembers.orgId,
          role: orgMembers.role,
        })
        .from(orgMembers)
        .where(eq(orgMembers.userId, options.userId))
        .all();

      for (const row of orgRows) {
        // Filter by orgIds if provided and not loadAll
        if (options.loadAll || options.orgIds?.includes(row.orgId as OrgId)) {
          orgRolesMap.set(row.orgId as OrgId, row.role as OrgRole);
        }
      }
    }

    const actor = createActor(options.userId, options.globalRole, committeeRolesMap, orgRolesMap);

    return Result.succeed(actor);
  } catch (error) {
    return Result.fail({
      code: "ACTOR_RESOLUTION_FAILED",
      message: `Actor の解決に失敗しました: ${error}`,
    });
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
