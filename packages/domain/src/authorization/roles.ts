/**
 * Authorization role definitions
 * Extracted to avoid circular dependencies between authorization and user schemas
 */

import { z } from "zod";

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
