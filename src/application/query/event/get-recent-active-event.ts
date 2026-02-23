import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const recentActiveEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RecentActiveEvent = z.infer<typeof recentActiveEventSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * 最近且つアクティブなイベントを1つ取得
 * アクティブなイベントの中から作成日時が最新のものを返す
 * 見つからない場合はnullを返す
 */
export async function getRecentActiveEvent(): Promise<
  Result.Result<RecentActiveEvent | null, QueryError>
> {
  try {
    const row = await db.query.events.findFirst({
      where: eq(events.status, "active"),
      orderBy: [desc(events.createdAt)],
    });

    if (!row) {
      return Result.succeed(null);
    }

    const event = recentActiveEventSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });

    return Result.succeed(event);
  } catch (error) {
    console.error("[Query Error] Failed to get recent active event", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "最新のアクティブイベントの取得に失敗しました。",
    });
  }
}
