import { z } from "zod";
import { Result } from "@akabase/result";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { tagSchema } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { projectIdSchema, projectPublishedSchema } from "@akabase/domain/project/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const projectPublishedDetailSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: projectPublishedSchema.shape.pamphletText,
  webContentJson: projectPublishedSchema.shape.webContentJson,
  openingHours: projectPublishedSchema.shape.openingHours,
  publishedAt: z.date(),
  tags: tagSchema.pick({ id: true, name: true }).array(),
});

export type ProjectPublishedDetail = z.infer<typeof projectPublishedDetailSchema>;

export async function getProjectPublished(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<ProjectPublishedDetail | null> {
  const authResult = deps.authService.enforce(
    actor,
    projectResource(projectId, eventId, orgId),
    "project:read",
  );
  if (Result.isFailure(authResult)) {
    return null;
  }

  try {
    const project = await deps.db.query.projects.findFirst({
      where: (projects, { eq, and }) =>
        and(eq(projects.id, projectId), eq(projects.eventId, eventId), eq(projects.orgId, orgId)),
      with: {
        place: true,
        published: {
          with: {
            tags: {
              with: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!project?.published) {
      return null;
    }

    const publishedRow = project.published;

    return projectPublishedDetailSchema.parse({
      projectId: publishedRow.projectId,
      pamphletText: publishedRow.pamphletText,
      webContentJson: publishedRow.webContentJson,
      openingHours: publishedRow.openingHours,
      publishedAt: publishedRow.publishedAt,
      tags: publishedRow.tags
        .toSorted((a, b) => a.tag.displayOrder - b.tag.displayOrder)
        .map((t) => ({ id: t.tag.id, name: t.tag.name })),
    });
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "公開用データの取得に失敗しました。", error);
  }
}
