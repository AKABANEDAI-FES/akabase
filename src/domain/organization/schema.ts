import { z } from "zod";
import { eventIdSchema, orgIdSchema, userIdSchema } from "../shared/ids";

/**
 * Schema constraints
 */
export const ORG_NAME_MIN_LENGTH = 1;
export const ORG_NAME_MAX_LENGTH = 100;
export const ORG_DESCRIPTION_MAX_LENGTH = 100;

/**
 * Organization
 * 団体の集約ルート
 */
export const organizationSchema = z.object({
  id: orgIdSchema,
  eventId: eventIdSchema,
  name: z
    .string()
    .min(ORG_NAME_MIN_LENGTH, "団体名を入力してください")
    .max(ORG_NAME_MAX_LENGTH, "団体名は100文字以内で入力してください"),
  description: z.string().max(ORG_DESCRIPTION_MAX_LENGTH, "説明は100文字以内で入力してください"),
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
