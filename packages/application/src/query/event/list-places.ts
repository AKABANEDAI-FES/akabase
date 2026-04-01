import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { eventIdSchema, placeIdSchema } from "@archive/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const placeListItemSchema = z.object({
  id: placeIdSchema,
  eventId: eventIdSchema,
  name: z.string(),
  parentId: placeIdSchema.nullable(),
  createdAt: z.date(),
});

export type PlaceListItem = z.infer<typeof placeListItemSchema>;

export async function listPlaces(
  deps: { db: Database },
  eventId: EventId,
): Promise<PlaceListItem[]> {
  try {
    const rows = await deps.db.query.places.findMany({
      where: eq(schema.places.eventId, eventId),
      orderBy: [asc(schema.places.name)],
    });

    return rows.map((row) =>
      placeListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        parentId: row.parentId,
        createdAt: new Date(row.createdAt),
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "開催場所の一覧取得に失敗しました。", error);
  }
}
