import { z } from "zod";
import { events } from "@/db/schema";
import { desc } from "drizzle-orm";
import { eventIdSchema } from "@/domain/shared/ids";
import type { Dependencies } from "@/infrastructure/di";
import { QueryException } from "../shared";

export const eventListItemSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
});

export type EventListItem = z.infer<typeof eventListItemSchema>;

/**
 * List all events
 *
 * @throws {QueryException} When database operation fails
 */
export async function listEvents(deps: Pick<Dependencies, "db">): Promise<EventListItem[]> {
  try {
    const rows = await deps.db.query.events.findMany({
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

    return eventList;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "イベント一覧の取得に失敗しました。", error);
  }
}
