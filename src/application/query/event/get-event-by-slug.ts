import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * DTO schema for event retrieved by slug
 */
export const eventBySlugSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EventBySlug = z.infer<typeof eventBySlugSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * Get event by slug
 * Returns null if not found
 */
export async function getEventBySlug(
  slug: string,
): Promise<Result.Result<EventBySlug | null, QueryError>> {
  try {
    const row = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!row) {
      return Result.succeed(null);
    }

    const event = eventBySlugSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });

    return Result.succeed(event);
  } catch (error) {
    console.error("[Query Error] Failed to get event by slug", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "イベントの取得に失敗しました。",
    });
  }
}
