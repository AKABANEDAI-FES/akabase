/**
 * Authorization domain schema
 * Type definitions for actors, resources, and actions
 */

import { z } from "zod";
import { eventIdSchema, orgIdSchema, projectIdSchema, userIdSchema } from "@/domain/shared/ids";
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
export const GLOBAL_ROLES = ["admin", "user"] as const;
export const globalRoleSchema = z.enum(GLOBAL_ROLES).default("user");

export type GlobalRole = z.infer<typeof globalRoleSchema>;

/**
 * Committee role within a specific event
 */
export const COMMITTEE_ROLES = ["admin", "approver", "member", "default"] as const;
export const committeeRoleSchema = z.enum(COMMITTEE_ROLES).default("default");

export type CommitteeRole = z.infer<typeof committeeRoleSchema>;

/**
 * Global role display labels (Japanese)
 */
export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  admin: "管理者",
  user: "一般ユーザー",
} as const;

/**
 * Committee role display labels (Japanese)
 */
export const COMMITTEE_ROLE_LABELS: Record<CommitteeRole, string> = {
  admin: "管理者",
  approver: "承認者",
  member: "メンバー",
  default: "デフォルト",
} as const;

/**
 * Organization role within a specific organization
 */
export const ORG_ROLES = ["manager", "editor"] as const;
export const orgRoleSchema = z.enum(ORG_ROLES).nullable();

export type OrgRole = z.infer<typeof orgRoleSchema>;

/**
 * Organization role display labels (Japanese)
 */
export const ORG_ROLE_LABELS: Record<"manager" | "editor", string> = {
  manager: "マネージャー",
  editor: "エディター",
} as const;

/**
 * Actor represents an authenticated user with their permissions
 * Encapsulates all authorization-related information
 */
export const actorSchema = z.object({
  userId: userIdSchema,
  globalRole: globalRoleSchema,

  // Event-level permissions (loaded on-demand or eagerly)
  committeeRoles: z.map(eventIdSchema, committeeRoleSchema),

  // Organization-level permissions (loaded on-demand or eagerly)
  orgRoles: z.map(orgIdSchema, orgRoleSchema),
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
  eventId: eventIdSchema,
  // Optional: include full entity for context-aware checks
  event: z.custom<Event>().optional(),
});

export type EventResource = z.infer<typeof eventResourceSchema>;

/**
 * Project resource
 */
export const projectResourceSchema = z.object({
  type: z.literal("project"),
  projectId: projectIdSchema,
  eventId: eventIdSchema, // Projects belong to events
  orgId: orgIdSchema, // Projects belong to organizations
  // Optional: include full entity for context-aware checks
  project: z.custom<Project>().optional(),
});

export type ProjectResource = z.infer<typeof projectResourceSchema>;

/**
 * Organization resource
 */
export const organizationResourceSchema = z.object({
  type: z.literal("organization"),
  orgId: orgIdSchema,
  eventId: eventIdSchema, // Organizations belong to events
  // Optional: include full entity for context-aware checks
  organization: z.custom<Organization>().optional(),
});

export type OrganizationResource = z.infer<typeof organizationResourceSchema>;

/**
 * User resource (for user management operations)
 */
export const userResourceSchema = z.object({
  type: z.literal("user"),
  userId: userIdSchema,
});

export type UserResource = z.infer<typeof userResourceSchema>;

/**
 * Resource types that can be protected by authorization
 */
export const resourceSchema = z.discriminatedUnion("type", [
  eventResourceSchema,
  projectResourceSchema,
  organizationResourceSchema,
  userResourceSchema,
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
  "organization:delete",
  "organization:manage_members",

  // Deadline actions (sub-resource of event)
  "deadline:create",
  "deadline:update",
  "deadline:delete",

  // Place actions (sub-resource of event)
  "place:create",
  "place:update",
  "place:delete",

  // Tag actions (sub-resource of event)
  "tag:create",
  "tag:update",
  "tag:delete",

  // Project draft actions
  "project_draft:update",

  // User actions
  "user:update_role",
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
