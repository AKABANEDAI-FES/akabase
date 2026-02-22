/**
 * Resource types and actions for authorization
 */

import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import type { Event } from "@/domain/event/schema";
import type { Project } from "@/domain/project/schema";
import type { Organization } from "@/domain/organization/schema";

/**
 * Resource types that can be protected by authorization
 */
export type Resource = EventResource | ProjectResource | OrganizationResource;

/**
 * Event resource
 */
export type EventResource = {
  type: "event";
  eventId: EventId;
  // Optional: include full entity for context-aware checks
  event?: Event;
};

/**
 * Project resource
 */
export type ProjectResource = {
  type: "project";
  projectId: ProjectId;
  eventId: EventId; // Projects belong to events
  orgId: OrgId; // Projects belong to organizations
  // Optional: include full entity for context-aware checks
  project?: Project;
};

/**
 * Organization resource
 */
export type OrganizationResource = {
  type: "organization";
  orgId: OrgId;
  eventId: EventId; // Organizations belong to events
  // Optional: include full entity for context-aware checks
  organization?: Organization;
};

/**
 * Actions that can be performed on resources
 */
export type Action =
  // Event actions
  | "event:create"
  | "event:read"
  | "event:update"
  | "event:archive"
  | "event:activate"

  // Project actions
  | "project:create"
  | "project:read"
  | "project:update"
  | "project:submit"
  | "project:approve"
  | "project:return"

  // Organization actions
  | "organization:create"
  | "organization:read"
  | "organization:update"
  | "organization:manage_members";

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
