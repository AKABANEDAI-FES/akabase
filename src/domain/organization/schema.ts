import { z } from "zod";
import type { EventId, OrgId, UserId } from "../shared/ids";

/**
 * Organization
 * 団体の集約ルート
 */
export const organizationSchema = z.object({
  id: z.custom<OrgId>(),
  eventId: z.custom<EventId>(),
  name: z.string(),
  description: z.string().max(100).nullable(),
  logoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Organization = z.infer<typeof organizationSchema>;

/**
 * Organization Member Role
 */
export const orgMemberRoleSchema = z.enum(["manager", "editor"]);

export type OrgMemberRole = z.infer<typeof orgMemberRoleSchema>;

/**
 * OrgMember
 * 団体のメンバー
 */
export const orgMemberSchema = z.object({
  id: z.string(),
  orgId: z.custom<OrgId>(),
  userId: z.custom<UserId>(),
  role: orgMemberRoleSchema,
  createdAt: z.date(),
});

export type OrgMember = z.infer<typeof orgMemberSchema>;
