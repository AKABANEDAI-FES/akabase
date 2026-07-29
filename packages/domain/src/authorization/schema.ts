/**
 * Authorization domain schema
 * Type definitions for actors, resources, and actions
 */

import { z } from "zod";
import { eventIdSchema } from "../event/schema";
import { orgIdSchema } from "../organization/schema";
import { projectIdSchema } from "../project/schema";
import { userIdSchema } from "../user/schema";
import type { Event } from "../event/schema";
import type { Project } from "../project/schema";
import type { Organization } from "../organization/schema";
import { committeeRoleSchema, globalRoleSchema, orgRoleSchema } from "./roles";

export {
  GLOBAL_ROLES,
  globalRoleSchema,
  type GlobalRole,
  COMMITTEE_ROLES,
  committeeRoleSchema,
  type CommitteeRole,
  GLOBAL_ROLE_LABELS,
  COMMITTEE_ROLE_LABELS,
  ORG_ROLES,
  orgRoleSchema,
  type OrgRole,
  ORG_ROLE_LABELS,
} from "./roles";

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
 * API key resource (for API key management operations)
 */
export const apiKeyResourceSchema = z.object({
  type: z.literal("api_key"),
});

export type ApiKeyResource = z.infer<typeof apiKeyResourceSchema>;

/**
 * Resource types that can be protected by authorization
 */
export const resourceSchema = z.discriminatedUnion("type", [
  eventResourceSchema,
  projectResourceSchema,
  organizationResourceSchema,
  userResourceSchema,
  apiKeyResourceSchema,
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
  "project:withdraw",

  // Organization actions
  "organization:create",
  "organization:read",
  "organization:update",
  "organization:delete",
  "organization:manage_members",

  // Project draft actions
  "project:update_draft",

  // User actions
  "user:update_role",
  "user:list",
  "user:list_for_event",

  // Event actions (for submissions)
  "event:list_submissions",

  // API key actions
  "api_key:create",
  "api_key:list",
  "api_key:delete",
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
