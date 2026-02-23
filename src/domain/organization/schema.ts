import { z } from "zod";
import { eventIdSchema, orgIdSchema, userIdSchema } from "../shared/ids";

/**
 * Organization
 * 団体の集約ルート
 */
export const organizationSchema = z.object({
  id: orgIdSchema,
  eventId: eventIdSchema,
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
  orgId: orgIdSchema,
  userId: userIdSchema,
  role: orgMemberRoleSchema,
  createdAt: z.date(),
});

export type OrgMember = z.infer<typeof orgMemberSchema>;
