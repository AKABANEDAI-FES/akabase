import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { placeIdSchema, tagIdSchema } from "@akabase/domain/event/schema";
import { orgIdSchema } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { projectIdSchema } from "@akabase/domain/project/schema";
import type { ImageRepository } from "@akabase/domain/shared/image";
import { QueryExceptionError, resolvePlacesWithPath, toTagItems } from "../shared";

export const externalProjectDetailSchema = z.object({
  id: projectIdSchema,
  name: z.string(),
  pamphletText: z.string(),
  webContentJson: z.json().nullable(),
  openingHours: z.string(),
  lastEntryTime: z.string(),
  logoUrl: z.string().nullable(),
  organization: z.object({
    id: orgIdSchema,
    name: z.string(),
    description: z.string(),
    logoUrl: z.string().nullable(),
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

export type ExternalProjectDetail = z.infer<typeof externalProjectDetailSchema>;

export async function getExternalProject(
  deps: { db: Database; imageRepo: ImageRepository },
  eventId: EventId,
  projectId: ProjectId,
): Promise<ExternalProjectDetail | null> {
  try {
    const row = await deps.db.query.projects.findFirst({
      where: and(eq(schema.projects.id, projectId), eq(schema.projects.eventId, eventId)),
      with: {
        organization: {
          columns: { id: true, name: true, description: true },
          with: {
            logoImage: {
              columns: { objectKey: true },
            },
          },
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
    });

    if (!row?.published) {
      return null;
    }

    const places =
      row.placeId === null
        ? []
        : await deps.db.query.places.findMany({
            columns: { id: true, name: true, parentId: true },
            where: eq(schema.places.eventId, eventId),
          });

    return externalProjectDetailSchema.parse({
      id: row.id,
      name: row.name,
      pamphletText: row.published.pamphletText,
      webContentJson: row.published.webContentJson,
      openingHours: row.published.openingHours,
      lastEntryTime: row.published.lastEntryTime,
      logoUrl: row.logoImage ? deps.imageRepo.getPublicUrl(row.logoImage.objectKey) : null,
      organization: {
        id: row.organization.id,
        name: row.organization.name,
        description: row.organization.description,
        logoUrl: row.organization.logoImage
          ? deps.imageRepo.getPublicUrl(row.organization.logoImage.objectKey)
          : null,
      },
      place: row.placeId === null ? null : (resolvePlacesWithPath(places).get(row.placeId) ?? null),
      tags: toTagItems(row.published.tags, eventId),
      publishedAt: row.published.publishedAt,
    });
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "公開企画の取得に失敗しました。", error);
  }
}
