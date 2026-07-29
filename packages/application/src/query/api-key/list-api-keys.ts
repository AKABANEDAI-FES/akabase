/**
 * List API keys query
 * Retrieves all API keys with their target event and creator
 */

import { z } from "zod";
import { inArray } from "drizzle-orm";
import { Result } from "@akabase/result";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import { apiKeyIdSchema } from "@akabase/domain/api-key/schema";
import { eventIdSchema } from "@akabase/domain/event/schema";
import type { EventId } from "@akabase/domain/event/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { apiKeyResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { userIdSchema } from "@akabase/domain/user/schema";
import { QueryExceptionError } from "../shared";

export const apiKeyListItemSchema = z.object({
  id: apiKeyIdSchema,
  name: z.string().nullable(),
  start: z.string().nullable(),
  event: z
    .object({
      id: eventIdSchema,
      name: z.string(),
    })
    .nullable(),
  createdBy: z.object({
    id: userIdSchema,
    name: z.string(),
  }),
  createdAt: z.date(),
});

export type ApiKeyListItem = z.infer<typeof apiKeyListItemSchema>;

function parseEventId(metadata: string | null): string | null {
  if (metadata === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (typeof parsed === "object" && parsed !== null && "eventId" in parsed) {
      const { eventId } = parsed;
      return typeof eventId === "string" ? eventId : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function listApiKeys(
  deps: { db: Database; authService: AuthorizationService },
  actor: Actor,
  options?: { eventId?: EventId },
): Promise<ApiKeyListItem[]> {
  const authResult = deps.authService.enforce(actor, apiKeyResource(), "api_key:list");
  if (Result.isFailure(authResult)) {
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db.query.apikey.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (apikey, { desc }) => [desc(apikey.createdAt)],
    });

    const filterEventId = options?.eventId;
    const keys = rows
      .map((row) => ({ row, eventId: parseEventId(row.metadata) }))
      .filter(({ eventId }) => filterEventId === undefined || eventId === filterEventId);

    const eventIds = [
      ...new Set(keys.flatMap(({ eventId }) => (eventId !== null ? [eventId] : []))),
    ];
    const events =
      eventIds.length > 0
        ? await deps.db.query.events.findMany({
            columns: { id: true, name: true },
            where: inArray(schema.events.id, eventIds),
          })
        : [];
    const eventMap = new Map(events.map((event) => [event.id, event]));

    return keys.map(({ row, eventId }) =>
      apiKeyListItemSchema.parse({
        id: row.id,
        name: row.name,
        start: row.start,
        event: (eventId !== null ? eventMap.get(eventId) : undefined) ?? null,
        createdBy: {
          id: row.user.id,
          name: row.user.name,
        },
        createdAt: new Date(row.createdAt),
      }),
    );
  } catch (error) {
    if (error instanceof QueryExceptionError) {
      throw error;
    }
    throw new QueryExceptionError("DATABASE_ERROR", "APIキー一覧の取得に失敗しました。", error);
  }
}
