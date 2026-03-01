import { z } from "zod";
import { places } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import { eventIdSchema, placeIdSchema } from "@/domain/shared/ids";
import type { Dependencies } from "@/infrastructure/di";
import { QueryException } from "../shared";

/**
 * DTO schema for place list item
 */
export const placeListItemSchema = z.object({
  id: placeIdSchema,
  eventId: eventIdSchema,
  name: z.string(),
  parentId: placeIdSchema.nullable(),
  createdAt: z.date(),
});

export type PlaceListItem = z.infer<typeof placeListItemSchema>;

/**
 * Get all places for a specific event
 * Returns empty array if no places found
 *
 * @throws {QueryException} When database operation fails
 */
export async function listPlaces(
  deps: Pick<Dependencies, "db">,
  eventId: EventId,
): Promise<PlaceListItem[]> {
  try {
    const rows = await deps.db.query.places.findMany({
      where: eq(places.eventId, eventId),
      orderBy: [asc(places.name)], // Alphabetical order for Select UI
    });

    const placeList: PlaceListItem[] = rows.map((row) =>
      placeListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        parentId: row.parentId,
        createdAt: new Date(row.createdAt),
      }),
    );

    return placeList;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "開催場所の一覧取得に失敗しました。", error);
  }
}
