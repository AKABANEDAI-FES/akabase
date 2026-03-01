import { z } from "zod";
import { events } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { eventIdSchema } from "@/domain/shared/ids";
import type { Dependencies } from "@/infrastructure/di";
import { QueryException } from "../shared";

export const recentActiveEventSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RecentActiveEvent = z.infer<typeof recentActiveEventSchema>;

/**
 * 最近且つアクティブなイベントを1つ取得
 * アクティブなイベントの中から作成日時が最新のものを返す
 * 見つからない場合はnullを返す
 *
 * @throws {QueryException} When database operation fails
 */
export async function getRecentActiveEvent(
  deps: Pick<Dependencies, "db">,
): Promise<RecentActiveEvent | null> {
  try {
    const row = await deps.db.query.events.findFirst({
      where: eq(events.status, "active"),
      orderBy: [desc(events.createdAt)],
    });

    if (!row) {
      return null;
    }

    const event = recentActiveEventSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });

    return event;
  } catch (error) {
    throw new QueryException(
      "DATABASE_ERROR",
      "最新のアクティブイベントの取得に失敗しました。",
      error,
    );
  }
}
