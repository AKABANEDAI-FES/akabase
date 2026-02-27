import { z } from "zod";
import { db } from "@/db";
import { deadlines } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import { deadlineIdSchema, eventIdSchema } from "@/domain/shared/ids";
import { DEADLINE_FIELD_KEYS } from "@/domain/event/schema";
import { QueryException } from "../shared";

/**
 * DTO schema for deadline list item
 */
export const deadlineListItemSchema = z.object({
  id: deadlineIdSchema,
  eventId: eventIdSchema,
  fieldKey: z.enum(DEADLINE_FIELD_KEYS),
  startAt: z.date().optional(),
  deadlineAt: z.date(),
  createdAt: z.date(),
});

export type DeadlineListItem = z.infer<typeof deadlineListItemSchema>;

/**
 * Get all deadlines for a specific event
 * Returns empty array if no deadlines found
 *
 * @throws {QueryException} When database operation fails
 */
export async function listDeadlines(eventId: EventId): Promise<DeadlineListItem[]> {
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
        startAt: row.startAt ? new Date(row.startAt) : undefined,
        deadlineAt: new Date(row.deadlineAt),
        createdAt: new Date(row.createdAt),
      }),
    );

    return deadlineList;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "締切一覧の取得に失敗しました。", error);
  }
}
