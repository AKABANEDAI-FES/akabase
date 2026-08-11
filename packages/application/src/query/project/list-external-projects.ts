import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { placeIdSchema, tagIdSchema } from "@akabase/domain/event/schema";
import { orgIdSchema } from "@akabase/domain/organization/schema";
import { projectIdSchema } from "@akabase/domain/project/schema";
import type { ImageRepository } from "@akabase/domain/shared/image";
import { QueryExceptionError, resolvePlacesWithPath, toTagItems } from "../shared";

export const externalProjectListItemSchema = z.object({
  id: projectIdSchema,
  name: z.string(),
  pamphletText: z.string(),
  openingHours: z.string(),
  lastEntryTime: z.string(),
  logoUrl: z.string().nullable(),
  organization: z.object({
    id: orgIdSchema,
    name: z.string(),
  }),
  place: z
    .object({
      id: placeIdSchema,
      name: z.string(),
      path: z.array(z.string()),
    })
    .nullable(),
  tags: z.array(z.object({ id: tagIdSchema, name: z.string() })),
  publishedAt: z.date(),
});

export type ExternalProjectListItem = z.infer<typeof externalProjectListItemSchema>;

export async function listExternalProjects(
  deps: { db: Database; imageRepo: ImageRepository },
  eventId: EventId,
): Promise<ExternalProjectListItem[]> {
  try {
    const [rows, places] = await Promise.all([
      deps.db.query.projects.findMany({
        where: eq(schema.projects.eventId, eventId),
        orderBy: [asc(schema.projects.name)],
        with: {
          organization: {
            columns: { id: true, name: true },
          },
          logoImage: {
            columns: { objectKey: true },
          },
          published: {
            with: {
              tags: {
                with: {
                  tag: {
                    columns: { id: true, name: true, displayOrder: true, eventId: true },
                  },
                },
              },
            },
          },
        },
      }),
      deps.db.query.places.findMany({
        columns: { id: true, name: true, parentId: true },
        where: eq(schema.places.eventId, eventId),
      }),
    ]);

    const placesWithPath = resolvePlacesWithPath(places);

    return rows
      .filter((row) => row.published !== null)
      .map((row) =>
        externalProjectListItemSchema.parse({
          id: row.id,
          name: row.name,
          pamphletText: row.published.pamphletText,
          openingHours: row.published.openingHours,
          lastEntryTime: row.published.lastEntryTime,
          logoUrl: row.logoImage ? deps.imageRepo.getPublicUrl(row.logoImage.objectKey) : null,
          organization: row.organization,
          place: row.placeId === null ? null : (placesWithPath.get(row.placeId) ?? null),
          tags: toTagItems(row.published.tags, eventId),
          publishedAt: row.published.publishedAt,
        }),
      );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "公開企画一覧の取得に失敗しました。", error);
  }
}
