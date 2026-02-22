import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc } from "drizzle-orm";

/**
 * Event list item DTO schema
 * イベント一覧表示用のDTOスキーマ
 */
export const eventListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
});

/**
 * Event list item DTO type (derived from schema)
 */
export type EventListItem = z.infer<typeof eventListItemSchema>;

/**
 * Query error type
 */
export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * List all events
 * 全イベントを一覧表示用に取得
 */
export async function listEvents(): Promise<Result.Result<EventListItem[], QueryError>> {
  try {
    const rows = await db.query.events.findMany({
      orderBy: [desc(events.createdAt)],
    });

    const eventList: EventListItem[] = rows.map((row) =>
      eventListItemSchema.parse({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: new Date(row.createdAt),
      }),
    );

    return Result.succeed(eventList);
  } catch (error) {
    console.error("[Query Error] Failed to list events", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "イベント一覧の取得に失敗しました。",
    });
  }
}
