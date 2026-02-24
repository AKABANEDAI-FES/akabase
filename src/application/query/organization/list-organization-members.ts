import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { orgMembers, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { userIdSchema } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";
import { orgMemberRoleSchema } from "@/domain/organization/schema";

/**
 * Organization member list item DTO
 */
export const organizationMemberListItemSchema = z.object({
  id: z.string(),
  userId: userIdSchema,
  name: z.string(),
  email: z.string(),
  role: orgMemberRoleSchema,
  createdAt: z.date(),
});

export type OrganizationMemberListItem = z.infer<typeof organizationMemberListItemSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * List organization members with user info
 *
 * @param orgId - Organization ID
 * @returns List of members with user details
 */
export async function listOrganizationMembers(
  orgId: OrgId,
): Promise<Result.Result<OrganizationMemberListItem[], QueryError>> {
  try {
    const rows = await db
      .select({
        id: orgMembers.id,
        userId: orgMembers.userId,
        name: user.name,
        email: user.email,
        role: orgMembers.role,
        createdAt: orgMembers.createdAt,
      })
      .from(orgMembers)
      .innerJoin(user, eq(orgMembers.userId, user.id))
      .where(eq(orgMembers.orgId, orgId));

    const members = rows.map((row) =>
      organizationMemberListItemSchema.parse({
        id: row.id,
        userId: row.userId,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: new Date(row.createdAt),
      }),
    );

    return Result.succeed(members);
  } catch (error) {
    console.error("[Query Error] Failed to list organization members", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "メンバー一覧の取得に失敗しました。",
    });
  }
}
