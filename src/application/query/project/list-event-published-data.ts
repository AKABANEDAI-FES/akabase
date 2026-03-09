import { z } from "zod";
import { eq } from "drizzle-orm";
import { placeIdSchema, projectIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import type { Dependencies } from "@/infrastructure/di";
import { Result } from "@praha/byethrow";
import { projects } from "@/db/schema";

/**
 * DTO schema for event published data export item
 */
export const eventPublishedDataItemSchema = z.object({
  projectId: projectIdSchema,
  projectName: z.string(),
  orgName: z.string(),
  pamphletText: z.string(),
  placeId: placeIdSchema.nullable(),
  placeName: z.string().nullable(),
  logoUrl: z.string().nullable(),
  tags: z.array(z.string()),
});

export type EventPublishedDataItem = z.infer<typeof eventPublishedDataItemSchema>;

/**
 * List all published data for an event (for export)
 *
 * Authorization: Committee members (admin/approver/member) can export published data
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of published data items for the event
 * @throws {QueryException} When database operation fails or authorization is denied
 */
export async function listEventPublishedData(
  deps: Pick<Dependencies, "db" | "authService" | "storageService">,
  eventId: EventId,
  actor: Actor,
): Promise<EventPublishedDataItem[]> {
  const authResult = deps.authService.enforce(
    actor,
    eventResource(eventId),
    "event:list_submissions",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db.query.projects.findMany({
      where: eq(projects.eventId, eventId),
      with: {
        organization: {
          columns: { name: true },
        },
        place: {
          columns: { name: true },
        },
        logoImage: {
          columns: { objectKey: true },
        },
        published: {
          with: {
            tags: {
              with: {
                tag: {
                  columns: { name: true, displayOrder: true },
                },
              },
            },
          },
        },
      },
    });

    return rows
      .filter((row) => row.published !== null)
      .map((row) =>
        eventPublishedDataItemSchema.parse({
          projectId: row.id,
          projectName: row.name,
          orgName: row.organization.name,
          pamphletText: row.published!.pamphletText,
          placeId: row.placeId,
          placeName: row.place?.name ?? null,
          logoUrl: row.logoImage ? deps.storageService.getPublicUrl(row.logoImage.objectKey) : null,
          tags: row.published.tags
            .sort((a, b) => a.tag.displayOrder - b.tag.displayOrder)
            .map((t) => t.tag.name),
        }),
      );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "公開データの取得に失敗しました。", error);
  }
}
