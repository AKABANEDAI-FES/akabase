import { z } from "zod";
import { Result } from "@akabase/result";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { tagSchema } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { projectDraftSchema, projectIdSchema } from "@akabase/domain/project/schema";
import { userIdSchema } from "@akabase/domain/user/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const draftDetailSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: projectDraftSchema.shape.pamphletText,
  webContentJson: projectDraftSchema.shape.webContentJson,
  updatedAt: z.date().nullable(),
  updatedBy: userIdSchema.nullable(),
  tags: tagSchema.pick({ id: true, name: true }).array(),
});

export type DraftDetail = z.infer<typeof draftDetailSchema>;

export async function getDraft(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<DraftDetail | null> {
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
      return draftDetailSchema.parse({
        projectId,
        pamphletText: "",
        webContentJson: null,
        updatedAt: null,
        updatedBy: null,
        tags: [],
      });
    }

    const draftRow = project.draft;

    return draftDetailSchema.parse({
      projectId: draftRow.projectId,
      pamphletText: draftRow.pamphletText,
      webContentJson: draftRow.webContentJson,
      updatedAt: draftRow.updatedAt,
      updatedBy: draftRow.updatedBy,
      tags: draftRow.tags
        .toSorted((a, b) => a.tag.displayOrder - b.tag.displayOrder)
        .map((t) => ({ id: t.tag.id, name: t.tag.name })),
    });
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "下書きの取得に失敗しました。", error);
  }
}
