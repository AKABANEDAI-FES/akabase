import { z } from "zod";
import { Result } from "@archive/result";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { tagSchema } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import { projectIdSchema, projectPublishedSchema } from "@archive/domain/project/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import { projectResource } from "@archive/domain/authorization/logic";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import { QueryException } from "../shared";

export const projectPublishedDetailSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: projectPublishedSchema.shape.pamphletText,
  webContentJson: projectPublishedSchema.shape.webContentJson,
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
      publishedAt: publishedRow.publishedAt,
      tags: publishedRow.tags
        .toSorted((a, b) => a.tag.displayOrder - b.tag.displayOrder)
        .map((t) => ({ id: t.tag.id, name: t.tag.name })),
    });
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "公開用データの取得に失敗しました。", error);
  }
}
