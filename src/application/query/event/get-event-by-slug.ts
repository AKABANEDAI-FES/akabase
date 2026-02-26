import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { eventIdSchema } from "@/domain/shared/ids";
import { QueryException } from "../shared";

/**
 * DTO schema for event retrieved by slug
 */
export const eventBySlugSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EventBySlug = z.infer<typeof eventBySlugSchema>;

/**
 * Get event by slug
 * Returns null if not found
 *
 * @throws {QueryException} When database operation fails
 */
export async function getEventBySlug(slug: string): Promise<EventBySlug | null> {
  try {
    const row = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!row) {
      return null;
    }

    const event = eventBySlugSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });

    return event;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "イベントの取得に失敗しました。", error);
  }
}
