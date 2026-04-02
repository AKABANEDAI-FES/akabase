import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { Result } from "@archive/result";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import { userIdSchema } from "@archive/domain/user/schema";
import { orgMemberRoleSchema } from "@archive/domain/organization/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import { organizationResource } from "@archive/domain/authorization/logic";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const organizationMemberListItemSchema = z.object({
  id: z.string(),
  userId: userIdSchema,
  name: z.string(),
  email: z.string(),
  role: orgMemberRoleSchema,
  createdAt: z.date(),
});

export type OrganizationMemberListItem = z.infer<typeof organizationMemberListItemSchema>;

export async function listOrganizationMembers(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Promise<OrganizationMemberListItem[]> {
  const authResult = deps.authService.enforce(
    actor,
    organizationResource(orgId, eventId),
    "organization:read",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db
      .select({
        id: schema.orgMembers.id,
        userId: schema.orgMembers.userId,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.orgMembers.role,
        createdAt: schema.orgMembers.createdAt,
      })
      .from(schema.orgMembers)
      .innerJoin(schema.user, eq(schema.orgMembers.userId, schema.user.id))
      .innerJoin(schema.organizations, eq(schema.orgMembers.orgId, schema.organizations.id))
      .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.organizations.eventId, eventId)));

    return rows.map((row) =>
      organizationMemberListItemSchema.parse({
        id: row.id,
        userId: row.userId,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: new Date(row.createdAt),
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "メンバー一覧の取得に失敗しました。", error);
  }
}
