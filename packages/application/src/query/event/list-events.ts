import { z } from "zod";
import { desc } from "drizzle-orm";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import { eventIdSchema } from "@archive/domain/event/schema";
import { QueryException } from "../shared";

export const eventListItemSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
});

export type EventListItem = z.infer<typeof eventListItemSchema>;

export async function listEvents(deps: { db: Database }): Promise<EventListItem[]> {
  try {
    const rows = await deps.db.query.events.findMany({
      orderBy: [desc(schema.events.createdAt)],
    });

    return rows.map((row) =>
      eventListItemSchema.parse({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: new Date(row.createdAt),
      }),
    );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "イベント一覧の取得に失敗しました。", error);
  }
}
