import { z } from "zod";
import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { db } from "@/db";
import { orgMembers, organizations, user } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { userIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId } from "@/domain/shared/ids";
import { orgMemberRoleSchema } from "@/domain/organization/schema";
import type { Actor } from "@/domain/authorization/schema";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Dependencies } from "@/infrastructure/di";
import { organizationResource } from "@/domain/authorization/logic";

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
 * Authorization: Committee members or organization members can read
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of members with user details
 */
export async function listOrganizationMembers(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Result.ResultAsync<OrganizationMemberListItem[], QueryError | AuthorizationError> {
  return gen(async function* ($) {
    // Authorization check: committee members or organization members can read
    yield* $(
      deps.authService.enforce(actor, organizationResource(orgId, eventId), "organization:read"),
    );

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
        .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
        .where(and(eq(orgMembers.orgId, orgId), eq(organizations.eventId, eventId)));

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

      return members;
    } catch (error) {
      console.error("[Query Error] Failed to list organization members", error);
      return yield* $(
        Result.fail({
          code: "DATABASE_ERROR",
          message: "メンバー一覧の取得に失敗しました。",
        }),
      );
    }
  });
}
