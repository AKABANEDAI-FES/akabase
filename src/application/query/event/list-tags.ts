import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import { eventIdSchema, tagIdSchema } from "@/domain/shared/ids";

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

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * Get all tags for a specific event
 * Returns empty array if no tags found
 */
export async function listTags(
  eventId: EventId,
): Promise<Result.Result<TagListItem[], QueryError>> {
  try {
    const rows = await db.query.tags.findMany({
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

    return Result.succeed(tagList);
  } catch (error) {
    console.error("[Query Error] Failed to list tags", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "タグ一覧の取得に失敗しました。",
    });
  }
}
