import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { eventIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";

export const eventDetailSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

export type QueryError = {
  code: "DATABASE_ERROR" | "NOT_FOUND";
  message: string;
};

export async function getEventDetail(
  eventId: EventId,
): Promise<Result.Result<EventDetail, QueryError>> {
  try {
    const row = await db.query.events.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
    });

    if (!row) {
      return Result.fail({
        code: "NOT_FOUND",
        message: "イベントが見つかりません。",
      });
    }

    const eventDetail: EventDetail = eventDetailSchema.parse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });

    return Result.succeed(eventDetail);
  } catch (error) {
    console.error("[Query Error] Failed to get event detail", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "イベント詳細の取得に失敗しました。",
    });
  }
}
