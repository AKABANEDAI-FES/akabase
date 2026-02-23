/**
 * Authorization domain schema
 * Type definitions for actors, resources, and actions
 */

import { z } from "zod";
import type { EventId, OrgId, ProjectId, UserId } from "@/domain/shared/ids";
import type { Event } from "@/domain/event/schema";
import type { Project } from "@/domain/project/schema";
import type { Organization } from "@/domain/organization/schema";

/**
 * =============================================================================
 * Actor Types
 * =============================================================================
 */

/**
 * Global role assigned to a user
 */
export const globalRoleSchema = z.enum(["admin", "user"]);

export type GlobalRole = z.infer<typeof globalRoleSchema>;

/**
 * Committee role within a specific event
 */
export const committeeRoleSchema = z.enum(["admin", "approver", "member", "default"]);

export type CommitteeRole = z.infer<typeof committeeRoleSchema>;

/**
 * Organization role within a specific organization
 */
export const orgRoleSchema = z.enum(["manager", "editor"]).nullable();

export type OrgRole = z.infer<typeof orgRoleSchema>;

/**
 * Actor represents an authenticated user with their permissions
 * Encapsulates all authorization-related information
 */
export const actorSchema = z.object({
  userId: z.custom<UserId>(),
  globalRole: globalRoleSchema,

  // Event-level permissions (loaded on-demand or eagerly)
  committeeRoles: z.map(z.custom<EventId>(), committeeRoleSchema),

  // Organization-level permissions (loaded on-demand or eagerly)
  orgRoles: z.map(z.custom<OrgId>(), orgRoleSchema),
});

export type Actor = z.infer<typeof actorSchema>;

/**
 * =============================================================================
 * Resource Types
 * =============================================================================
 */

/**
 * Event resource
 */
export const eventResourceSchema = z.object({
  type: z.literal("event"),
  eventId: z.custom<EventId>(),
  // Optional: include full entity for context-aware checks
  event: z.custom<Event>().optional(),
});

export type EventResource = z.infer<typeof eventResourceSchema>;

/**
 * Project resource
 */
export const projectResourceSchema = z.object({
  type: z.literal("project"),
  projectId: z.custom<ProjectId>(),
  eventId: z.custom<EventId>(), // Projects belong to events
  orgId: z.custom<OrgId>(), // Projects belong to organizations
  // Optional: include full entity for context-aware checks
  project: z.custom<Project>().optional(),
});

export type ProjectResource = z.infer<typeof projectResourceSchema>;

/**
 * Organization resource
 */
export const organizationResourceSchema = z.object({
  type: z.literal("organization"),
  orgId: z.custom<OrgId>(),
  eventId: z.custom<EventId>(), // Organizations belong to events
  // Optional: include full entity for context-aware checks
  organization: z.custom<Organization>().optional(),
});

export type OrganizationResource = z.infer<typeof organizationResourceSchema>;

/**
 * Resource types that can be protected by authorization
 */
export const resourceSchema = z.discriminatedUnion("type", [
  eventResourceSchema,
  projectResourceSchema,
  organizationResourceSchema,
]);

export type Resource = z.infer<typeof resourceSchema>;

/**
 * =============================================================================
 * Action Types
 * =============================================================================
 */

/**
 * Actions that can be performed on resources
 */
export const actionSchema = z.enum([
  // Event actions
  "event:create",
  "event:read",
  "event:update",
  "event:archive",
  "event:activate",

  // Project actions
  "project:create",
  "project:read",
  "project:update",
  "project:submit",
  "project:approve",
  "project:return",

  // Organization actions
  "organization:create",
  "organization:read",
  "organization:update",
  "organization:manage_members",
]);

export type Action = z.infer<typeof actionSchema>;

/**
 * =============================================================================
 * Authorization Decision
 * =============================================================================
 */

/**
 * Authorization decision with optional reason
 */
export const authorizationDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(), // Optional explanation for denial
});

export type AuthorizationDecision = z.infer<typeof authorizationDecisionSchema>;
