import { z } from "zod";
import { db } from "@/db";
import { eventIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import { QueryException } from "../shared";

export const eventDetailSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

/**
 * Get event detail by ID
 * Returns null if not found
 *
 * @throws {QueryException} When database operation fails
 */
export async function getEventDetail(eventId: EventId): Promise<EventDetail | null> {
  try {
    const row = await db.query.events.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
    });

    if (!row) {
      return null;
    }

    const eventDetail: EventDetail = eventDetailSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });

    return eventDetail;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "イベント詳細の取得に失敗しました。", error);
  }
}
