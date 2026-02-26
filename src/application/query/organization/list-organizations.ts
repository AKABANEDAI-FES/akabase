import { z } from "zod";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import { QueryException } from "../shared";

/**
 * DTO schema for organization list item
 */
export const organizationListItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrganizationListItem = z.infer<typeof organizationListItemSchema>;

/**
 * List all organizations for a specific event
 *
 * @param eventId - Event ID to filter organizations
 * @returns List of organizations sorted by creation date (newest first)
 * @throws {QueryException} When database operation fails
 */
export async function listOrganizations(eventId: EventId): Promise<OrganizationListItem[]> {
  try {
    const rows = await db.query.organizations.findMany({
      where: eq(organizations.eventId, eventId),
      orderBy: [desc(organizations.createdAt)],
    });

    const orgList: OrganizationListItem[] = rows.map((row) =>
      organizationListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        description: row.description,
        logoKey: row.logoKey,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }),
    );

    return orgList;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "出展団体一覧の取得に失敗しました。", error);
  }
}
