import { z } from "zod";
import { projectIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import { projectPublishedSchema } from "@/domain/project/schema";
import { tagSchema } from "@/domain/event/schema";
import type { Actor } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import { projectResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import { Result } from "@praha/byethrow";

/**
 * DTO schema for project published detail
 */
export const projectPublishedDetailSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: projectPublishedSchema.shape.pamphletText,
  webContentJson: projectPublishedSchema.shape.webContentJson,
  publishedAt: z.date(),
  tags: tagSchema.pick({ id: true, name: true }).array(),
});

export type ProjectPublishedDetail = z.infer<typeof projectPublishedDetailSchema>;

/**
 * Get published data by project ID
 *
 * Authorization: Committee admins or organization managers/editors can read published data
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns Published detail or null if not found / not authorized
 * @throws {QueryException} When database operation fails
 */
export async function getProjectPublished(
  deps: Pick<Dependencies, "db" | "authService">,
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<ProjectPublishedDetail | null> {
  // Authorization check: project:read permission
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

    const published = projectPublishedDetailSchema.parse({
      projectId: publishedRow.projectId,
      pamphletText: publishedRow.pamphletText,
      webContentJson: publishedRow.webContentJson,
      publishedAt: publishedRow.publishedAt,
      tags: publishedRow.tags
        .sort((a, b) => a.tag.displayOrder - b.tag.displayOrder)
        .map((t) => ({ id: t.tag.id, name: t.tag.name })),
    });

    return published;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "公開用データの取得に失敗しました。", error);
  }
}
