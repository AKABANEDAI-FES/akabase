import { z } from "zod";
import { db } from "@/db";
import { orgMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { orgIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { orgMemberRoleSchema, organizationSchema } from "@/domain/organization/schema";
import { QueryException } from "../shared";

/**
 * DTO schema for user's organization list item
 */
export const myOrganizationListItemSchema = z.object({
  id: orgIdSchema,
  name: organizationSchema.shape.name,
  role: orgMemberRoleSchema,
});

export type MyOrganizationListItem = z.infer<typeof myOrganizationListItemSchema>;

/**
 * List organizations the current user belongs to for a specific event
 *
 * @param eventId - Event ID to filter organizations
 * @param actor - Authenticated actor
 * @returns List of organizations the user is a member of
 * @throws {QueryException} When database operation fails
 */
export async function listMyOrganizations(
  eventId: EventId,
  actor: Actor,
): Promise<MyOrganizationListItem[]> {
  try {
    const rows = await db.query.orgMembers.findMany({
      where: and(eq(orgMembers.userId, actor.userId)),
      columns: {
        role: true,
      },
      with: {
        organization: {
          columns: { id: true, name: true, eventId: true },
        },
      },
    });

    const filtered = rows.filter((row) => row.organization.eventId === eventId);

    const list: MyOrganizationListItem[] = filtered.map((row) =>
      myOrganizationListItemSchema.parse({
        id: row.organization.id,
        name: row.organization.name,
        role: row.role,
      }),
    );

    return list;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "所属団体の取得に失敗しました。", error);
  }
}
