import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import { eventIdSchema } from "@akabase/domain/event/schema";
import type { EventId } from "@akabase/domain/event/schema";
import { QueryExceptionError } from "../shared";

export const eventSettingsDetailSchema = z.object({
  eventId: eventIdSchema,
  webContentDescription: z.string().nullable(),
});

export type EventSettingsDetail = z.infer<typeof eventSettingsDetailSchema>;

// Missing row resolves to defaults; event existence is the route layer's concern
export async function getEventSettings(
  deps: { db: Database },
  eventId: EventId,
): Promise<EventSettingsDetail> {
  try {
    const row = await deps.db.query.eventSettings.findFirst({
      where: eq(schema.eventSettings.eventId, eventId),
    });

    return eventSettingsDetailSchema.parse({
      eventId,
      webContentDescription: row?.webContentDescription ?? null,
    });
  } catch (error) {
    throw new QueryExceptionError(
      "DATABASE_ERROR",
      "イベント詳細設定の取得に失敗しました。",
      error,
    );
  }
}
