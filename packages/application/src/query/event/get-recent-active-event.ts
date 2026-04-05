import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const recentActiveEventSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RecentActiveEvent = z.infer<typeof recentActiveEventSchema>;

export async function getRecentActiveEvent(deps: {
  db: Database;
}): Promise<RecentActiveEvent | null> {
  try {
    const row = await deps.db.query.events.findFirst({
      where: eq(schema.events.status, "active"),
      orderBy: [desc(schema.events.createdAt)],
    });

    if (!row) {
      return null;
    }

    return recentActiveEventSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  } catch (error) {
    throw new QueryExceptionError(
      "DATABASE_ERROR",
      "最新のアクティブイベントの取得に失敗しました。",
      error,
    );
  }
}
