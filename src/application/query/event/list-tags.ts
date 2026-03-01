import { z } from "zod";
import { tags } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import { eventIdSchema, tagIdSchema } from "@/domain/shared/ids";
import type { Dependencies } from "@/infrastructure/di";
import { QueryException } from "../shared";

/**
 * DTO schema for tag list item
 */
export const tagListItemSchema = z.object({
  id: tagIdSchema,
  eventId: eventIdSchema,
  name: z.string(),
  createdAt: z.date(),
});

export type TagListItem = z.infer<typeof tagListItemSchema>;

/**
 * Get all tags for a specific event
 * Returns empty array if no tags found
 *
 * @throws {QueryException} When database operation fails
 */
export async function listTags(
  deps: Pick<Dependencies, "db">,
  eventId: EventId,
): Promise<TagListItem[]> {
  try {
    const rows = await deps.db.query.tags.findMany({
      where: eq(tags.eventId, eventId),
      orderBy: [asc(tags.name)], // Alphabetical order
    });

    const tagList: TagListItem[] = rows.map((row) =>
      tagListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        createdAt: new Date(row.createdAt),
      }),
    );

    return tagList;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "タグ一覧の取得に失敗しました。", error);
  }
}
