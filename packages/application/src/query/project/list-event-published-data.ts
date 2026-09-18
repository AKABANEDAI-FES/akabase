import { z } from "zod";
import { eq } from "drizzle-orm";
import { Result } from "@akabase/result";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { placeIdSchema, projectCategoryIdSchema } from "@akabase/domain/event/schema";
import { projectIdSchema } from "@akabase/domain/project/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { ImageRepository } from "@akabase/domain/shared/image";
import { QueryExceptionError } from "../shared";

export const eventPublishedDataItemSchema = z.object({
  projectId: projectIdSchema,
  projectName: z.string(),
  orgName: z.string(),
  pamphletText: z.string(),
  openingHours: z.string(),
  placeId: placeIdSchema.nullable(),
  placeName: z.string().nullable(),
  categoryId: projectCategoryIdSchema.nullable(),
  categoryName: z.string().nullable(),
  categoryDisplayOrder: z.number().int().nullable(),
  contestVoteNumber: z.string().nullable(),
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
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
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
        category: {
          columns: { name: true, displayOrder: true },
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
          openingHours: row.published.openingHours,
          placeId: row.placeId,
          placeName: row.place?.name ?? null,
          categoryId: row.categoryId,
          categoryName: row.category?.name ?? null,
          categoryDisplayOrder: row.category?.displayOrder ?? null,
          contestVoteNumber: row.contestVoteNumber,
          logoUrl: row.logoImage ? deps.imageRepo.getPublicUrl(row.logoImage.objectKey) : null,
          tags: row.published.tags
            .toSorted((a, b) => a.tag.displayOrder - b.tag.displayOrder)
            .map((t) => t.tag.name),
        }),
      );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "公開データの取得に失敗しました。", error);
  }
}
