/**
 * Authorization domain logic
 * Helper functions for creating and querying actors and resources
 */

import { actorSchema } from "./schema";
import type {
  Actor,
  ApiKeyResource,
  CommitteeRole,
  EventResource,
  GlobalRole,
  OrgRole,
  OrganizationResource,
  ProjectResource,
  UserResource,
} from "./schema";
import type { Event, EventId } from "../event/schema";
import type { OrgId, Organization } from "../organization/schema";
import type { Project, ProjectId } from "../project/schema";
import type { UserId } from "../user/schema";

/**
 * =============================================================================
 * Actor Helper Functions
 * =============================================================================
 */

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
  globalRole: GlobalRole = "user",
  committeeRoles = new Map<EventId, CommitteeRole>(),
  orgRoles = new Map<OrgId, OrgRole>(),
): Actor {
  return actorSchema.parse({
    userId,
    globalRole,
    committeeRoles,
    orgRoles,
  });
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
  return actor.committeeRoles.get(eventId) ?? "default";
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

/**
 * =============================================================================
 * Resource Helper Functions
 * =============================================================================
 */

/**
 * Create an event resource
 *
 * @param eventId - Event ID
 * @param event - Optional event entity
 * @returns Event resource
 */
export function eventResource(eventId: EventId, event?: Event): EventResource {
  return { type: "event", eventId, event };
}

/**
 * Create a project resource
 *
 * @param projectId - Project ID
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param project - Optional project entity
 * @returns Project resource
 */
export function projectResource(
  projectId: ProjectId,
  eventId: EventId,
  orgId: OrgId,
  project?: Project,
): ProjectResource {
  return { type: "project", projectId, eventId, orgId, project };
}

/**
 * Create an organization resource
 *
 * @param orgId - Organization ID
 * @param eventId - Event ID
 * @param organization - Optional organization entity
 * @returns Organization resource
 */
export function organizationResource(
  orgId: OrgId,
  eventId: EventId,
  organization?: Organization,
): OrganizationResource {
  return { type: "organization", orgId, eventId, organization };
}

/**
 * Create a user resource
 *
 * @param userId - User ID
 * @returns User resource
 */
export function userResource(userId: UserId): UserResource {
  return { type: "user", userId };
}

/**
 * Create an API key resource
 *
 * @returns API key resource
 */
export function apiKeyResource(): ApiKeyResource {
  return { type: "api_key" };
}
