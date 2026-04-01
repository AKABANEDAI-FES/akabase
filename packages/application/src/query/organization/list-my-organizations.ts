import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import {
  orgIdSchema,
  orgMemberRoleSchema,
  organizationSchema,
} from "@archive/domain/organization/schema";
import { QueryExceptionError } from "../shared";

export const myOrganizationListItemSchema = z.object({
  id: orgIdSchema,
  name: organizationSchema.shape.name,
  role: orgMemberRoleSchema,
});

export type MyOrganizationListItem = z.infer<typeof myOrganizationListItemSchema>;

export async function listMyOrganizations(
  deps: { db: Database },
  eventId: EventId,
  actor: Actor,
): Promise<MyOrganizationListItem[]> {
  try {
    const rows = await deps.db.query.orgMembers.findMany({
      where: eq(schema.orgMembers.userId, actor.userId),
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

    return filtered.map((row) =>
      myOrganizationListItemSchema.parse({
        id: row.organization.id,
        name: row.organization.name,
        role: row.role,
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "所属出展団体の取得に失敗しました。", error);
  }
}
