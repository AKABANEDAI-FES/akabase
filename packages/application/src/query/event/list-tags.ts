import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { eventIdSchema, tagIdSchema } from "@akabase/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const tagListItemSchema = z.object({
  id: tagIdSchema,
  eventId: eventIdSchema,
  name: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.date(),
});

export type TagListItem = z.infer<typeof tagListItemSchema>;

export async function listTags(deps: { db: Database }, eventId: EventId): Promise<TagListItem[]> {
  try {
    const rows = await deps.db.query.tags.findMany({
      where: eq(schema.tags.eventId, eventId),
      orderBy: [asc(schema.tags.displayOrder)],
    });

    return rows.map((row) =>
      tagListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        displayOrder: row.displayOrder,
        createdAt: new Date(row.createdAt),
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "タグ一覧の取得に失敗しました。", error);
  }
}
