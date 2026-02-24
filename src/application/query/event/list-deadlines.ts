import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { deadlines } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import { deadlineIdSchema, eventIdSchema } from "@/domain/shared/ids";

/**
 * DTO schema for deadline list item
 */
export const deadlineListItemSchema = z.object({
  id: deadlineIdSchema,
  eventId: eventIdSchema,
  fieldKey: z.string(),
  deadlineAt: z.date(),
  createdAt: z.date(),
});

export type DeadlineListItem = z.infer<typeof deadlineListItemSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * Get all deadlines for a specific event
 * Returns empty array if no deadlines found
 */
export async function listDeadlines(
  eventId: EventId,
): Promise<Result.Result<DeadlineListItem[], QueryError>> {
  try {
    const rows = await db.query.deadlines.findMany({
      where: eq(deadlines.eventId, eventId),
      orderBy: [asc(deadlines.deadlineAt)], // Chronological order
    });

    const deadlineList: DeadlineListItem[] = rows.map((row) =>
      deadlineListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        fieldKey: row.fieldKey,
        deadlineAt: new Date(row.deadlineAt),
        createdAt: new Date(row.createdAt),
      }),
    );

    return Result.succeed(deadlineList);
  } catch (error) {
    console.error("[Query Error] Failed to list deadlines", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "締切一覧の取得に失敗しました。",
    });
  }
}
