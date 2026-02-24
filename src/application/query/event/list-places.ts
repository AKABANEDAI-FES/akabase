import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { places } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import { eventIdSchema, placeIdSchema } from "@/domain/shared/ids";

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

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * Get all places for a specific event
 * Returns empty array if no places found
 */
export async function listPlaces(
  eventId: EventId,
): Promise<Result.Result<PlaceListItem[], QueryError>> {
  try {
    const rows = await db.query.places.findMany({
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

    return Result.succeed(placeList);
  } catch (error) {
    console.error("[Query Error] Failed to list places", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "開催場所の一覧取得に失敗しました。",
    });
  }
}
