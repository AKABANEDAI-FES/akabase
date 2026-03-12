import { z } from "zod";
import { eq } from "drizzle-orm";
import { Result } from "@archive/result";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { placeIdSchema } from "@archive/domain/event/schema";
import { projectIdSchema } from "@archive/domain/project/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { ImageRepository } from "@archive/domain/shared/image";
import { QueryException } from "../shared";

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

export async function listEventPublishedData(
  deps: { db: Database; authService: AuthorizationService; imageRepo: ImageRepository },
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
      where: eq(schema.projects.eventId, eventId),
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
          pamphletText: row.published.pamphletText,
          placeId: row.placeId,
          placeName: row.place?.name ?? null,
          logoUrl: row.logoImage ? deps.imageRepo.getPublicUrl(row.logoImage.objectKey) : null,
          tags: row.published.tags
            .toSorted((a, b) => a.tag.displayOrder - b.tag.displayOrder)
            .map((t) => t.tag.name),
        }),
      );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "公開データの取得に失敗しました。", error);
  }
}
