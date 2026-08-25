import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { eventIdSchema, projectCategoryIdSchema } from "@akabase/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const projectCategoryListItemSchema = z.object({
  id: projectCategoryIdSchema,
  eventId: eventIdSchema,
  name: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.date(),
});

export type ProjectCategoryListItem = z.infer<typeof projectCategoryListItemSchema>;

export async function listProjectCategories(
  deps: { db: Database },
  eventId: EventId,
): Promise<ProjectCategoryListItem[]> {
  try {
    const rows = await deps.db.query.projectCategories.findMany({
      where: eq(schema.projectCategories.eventId, eventId),
      orderBy: [asc(schema.projectCategories.displayOrder)],
    });

    return rows.map((row) =>
      projectCategoryListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        displayOrder: row.displayOrder,
        createdAt: new Date(row.createdAt),
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "企画区分一覧の取得に失敗しました。", error);
  }
}
