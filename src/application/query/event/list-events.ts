import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc } from "drizzle-orm";

export const eventListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
});

export type EventListItem = z.infer<typeof eventListItemSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

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
