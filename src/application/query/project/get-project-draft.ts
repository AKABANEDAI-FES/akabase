import { z } from "zod";
import { projectIdSchema, userIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import { projectDraftSchema } from "@/domain/project/schema";
import { tagSchema } from "@/domain/event/schema";
import type { Actor } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import { projectResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import { Result } from "@praha/byethrow";

/**
 * DTO schema for project draft
 */
export const draftDetailSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: projectDraftSchema.shape.pamphletText,
  webContentJson: projectDraftSchema.shape.webContentJson,
  updatedAt: z.date().nullable(),
  updatedBy: userIdSchema.nullable(),
  tags: tagSchema.pick({ id: true, name: true }).array(),
});

export type DraftDetail = z.infer<typeof draftDetailSchema>;

/**
 * Get draft by project ID
 *
 * Authorization: Committee admins or organization managers/editors can read drafts
 *
 * @param deps - Dependencies (authService)
 * @param projectId - Project ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns Draft detail or null if not found / not authorized
 * @throws {QueryException} When database operation fails
 */
export async function getDraft(
  deps: Pick<Dependencies, "db" | "authService">,
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<DraftDetail | null> {
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
        draft: {
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

    if (!project?.draft) {
      const draft = draftDetailSchema.parse({
        projectId,
        pamphletText: "",
        webContentJson: null,
        updatedAt: null,
        updatedBy: null,
        tags: [],
      });
      return draft;
    }

    const draftRow = project.draft;

    const draft = draftDetailSchema.parse({
      projectId: draftRow.projectId,
      pamphletText: draftRow.pamphletText,
      webContentJson: draftRow.webContentJson,
      updatedAt: draftRow.updatedAt,
      updatedBy: draftRow.updatedBy,
      tags: draftRow.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
    });

    return draft;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "下書きの取得に失敗しました。", error);
  }
}
