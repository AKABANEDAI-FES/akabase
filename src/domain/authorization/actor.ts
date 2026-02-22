/**
 * Actor represents an authenticated user with their permissions
 * Acts as the security principal for authorization checks
 */

import type { EventId, OrgId, UserId } from "@/domain/shared/ids";

/**
 * Global role assigned to a user
 */
export type GlobalRole = "admin" | null;

/**
 * Committee role within a specific event
 */
export type CommitteeRole = "admin" | "approver" | "member" | "default" | null;

/**
 * Organization role within a specific organization
 */
export type OrgRole = "manager" | "editor" | null;

/**
 * Actor represents an authenticated user with their permissions
 * Encapsulates all authorization-related information
 */
export type Actor = {
  userId: UserId;
  globalRole: GlobalRole;

  // Event-level permissions (loaded on-demand or eagerly)
  committeeRoles: Map<EventId, CommitteeRole>;

  // Organization-level permissions (loaded on-demand or eagerly)
  orgRoles: Map<OrgId, OrgRole>;
};

/**
 * Create an Actor instance
 *
 * @param userId - User ID
 * @param globalRole - Global admin role
 * @param committeeRoles - Committee roles by event ID
 * @param orgRoles - Organization roles by organization ID
 * @returns Actor instance
 */
export function createActor(
  userId: UserId,
  globalRole: GlobalRole,
  committeeRoles: Map<EventId, CommitteeRole> = new Map(),
  orgRoles: Map<OrgId, OrgRole> = new Map(),
): Actor {
  return {
    userId,
    globalRole,
    committeeRoles,
    orgRoles,
  };
}

/**
 * Check if actor is a global admin
 *
 * @param actor - Actor to check
 * @returns True if actor is a global admin
 */
export function isGlobalAdmin(actor: Actor): boolean {
  return actor.globalRole === "admin";
}

/**
 * Get committee role for a specific event
 *
 * @param actor - Actor to check
 * @param eventId - Event ID
 * @returns Committee role for the event, or null if no role
 */
export function getCommitteeRoleForEvent(actor: Actor, eventId: EventId): CommitteeRole {
  return actor.committeeRoles.get(eventId) ?? null;
}

/**
 * Get organization role for a specific organization
 *
 * @param actor - Actor to check
 * @param orgId - Organization ID
 * @returns Organization role, or null if no role
 */
export function getOrgRoleForOrg(actor: Actor, orgId: OrgId): OrgRole {
  return actor.orgRoles.get(orgId) ?? null;
}
