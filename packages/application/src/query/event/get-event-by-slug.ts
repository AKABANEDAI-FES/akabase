import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const eventBySlugSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EventBySlug = z.infer<typeof eventBySlugSchema>;

export async function getEventBySlug(
  deps: { db: Database },
  slug: string,
): Promise<EventBySlug | null> {
  try {
    const row = await deps.db.query.events.findFirst({
      where: eq(schema.events.slug, slug),
    });

    if (!row) {
      return null;
    }

    return eventBySlugSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "イベントの取得に失敗しました。", error);
  }
}
