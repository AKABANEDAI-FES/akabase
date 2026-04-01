import { z } from "zod";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { eventIdSchema } from "@archive/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const eventDetailSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

export async function getEventDetail(
  deps: { db: Database },
  eventId: EventId,
): Promise<EventDetail | null> {
  try {
    const row = await deps.db.query.events.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
    });

    if (!row) {
      return null;
    }

    return eventDetailSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "イベント詳細の取得に失敗しました。", error);
  }
}
