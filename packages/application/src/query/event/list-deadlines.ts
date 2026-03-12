import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import { DEADLINE_FIELD_KEYS, deadlineIdSchema, eventIdSchema } from "@archive/domain/event/schema";
import type { EventId } from "@archive/domain/event/schema";
import { QueryException } from "../shared";

export const deadlineListItemSchema = z.object({
  id: deadlineIdSchema,
  eventId: eventIdSchema,
  fieldKey: z.enum(DEADLINE_FIELD_KEYS),
  startAt: z.date().optional(),
  deadlineAt: z.date(),
  createdAt: z.date(),
});

export type DeadlineListItem = z.infer<typeof deadlineListItemSchema>;

export async function listDeadlines(
  deps: { db: Database },
  eventId: EventId,
): Promise<DeadlineListItem[]> {
  try {
    const rows = await deps.db.query.deadlines.findMany({
      where: eq(schema.deadlines.eventId, eventId),
      orderBy: [asc(schema.deadlines.deadlineAt)],
    });

    return rows.map((row) =>
      deadlineListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        fieldKey: row.fieldKey,
        startAt: row.startAt ? new Date(row.startAt) : undefined,
        deadlineAt: new Date(row.deadlineAt),
        createdAt: new Date(row.createdAt),
      }),
    );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "締切一覧の取得に失敗しました。", error);
  }
}
