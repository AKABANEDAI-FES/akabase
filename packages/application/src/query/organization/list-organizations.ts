import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const organizationListItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoImageId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrganizationListItem = z.infer<typeof organizationListItemSchema>;

export async function listOrganizations(
  deps: { db: Database },
  eventId: EventId,
): Promise<OrganizationListItem[]> {
  try {
    const rows = await deps.db.query.organizations.findMany({
      where: eq(schema.organizations.eventId, eventId),
      orderBy: [desc(schema.organizations.createdAt)],
    });

    return rows.map((row) =>
      organizationListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        description: row.description,
        logoImageId: row.logoImageId,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "出展団体一覧の取得に失敗しました。", error);
  }
}
