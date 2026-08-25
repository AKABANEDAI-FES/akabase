import { z } from "zod";
import { and, asc, count, eq } from "drizzle-orm";
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
  projectCount: z.number().int().nonnegative(),
});

export type ProjectCategoryListItem = z.infer<typeof projectCategoryListItemSchema>;

export async function listProjectCategories(
  deps: { db: Database },
  eventId: EventId,
): Promise<ProjectCategoryListItem[]> {
  try {
    const rows = await deps.db
      .select({
        id: schema.projectCategories.id,
        eventId: schema.projectCategories.eventId,
        name: schema.projectCategories.name,
        displayOrder: schema.projectCategories.displayOrder,
        createdAt: schema.projectCategories.createdAt,
        projectCount: count(schema.projects.id),
      })
      .from(schema.projectCategories)
      .leftJoin(
        schema.projects,
        and(
          eq(schema.projects.categoryId, schema.projectCategories.id),
          eq(schema.projects.eventId, eventId),
        ),
      )
      .where(eq(schema.projectCategories.eventId, eventId))
      .groupBy(schema.projectCategories.id)
      .orderBy(asc(schema.projectCategories.displayOrder));

    return rows.map((row) =>
      projectCategoryListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        displayOrder: row.displayOrder,
        createdAt: row.createdAt,
        projectCount: row.projectCount,
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "企画区分一覧の取得に失敗しました。", error);
  }
}
