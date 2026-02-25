import { z } from "zod";
import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { db } from "@/db";
import { projectIdSchema, userIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import { projectDraftSchema } from "@/domain/project/schema";
import { tagSchema } from "@/domain/event/schema";
import type { Actor } from "@/domain/authorization/schema";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Dependencies } from "@/infrastructure/di";
import { projectResource } from "@/domain/authorization/logic";

/**
 * DTO schema for project draft
 */
export const draftDetailSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: projectDraftSchema.shape.pamphletText,
  webContentJson: projectDraftSchema.shape.webContentJson,
  updatedAt: z.date(),
  updatedBy: userIdSchema,
  tags: tagSchema.pick({ id: true, name: true }).array(),
});

export type DraftDetail = z.infer<typeof draftDetailSchema>;

export type QueryError = {
  code: "DATABASE_ERROR" | "NOT_FOUND";
  message: string;
};

/**
 * Get draft by project ID
 *
 * Authorization: Committee admins or organization managers/editors can read drafts
 *
 * @param deps - Dependencies (authService)
 * @param projectId - Project ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns Result with draft detail or error
 */
export async function getDraft(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Result.ResultAsync<DraftDetail | null, QueryError | AuthorizationError> {
  return gen(async function* ($) {
    try {
      // Authorization check: project:read permission
      yield* $(
        deps.authService.enforce(actor, projectResource(projectId, eventId, orgId), "project:read"),
      );

      const project = await db.query.projects.findFirst({
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
        return null;
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
      console.error("[Query Error] Failed to get draft", error);
      return yield* $(
        Result.fail({
          code: "DATABASE_ERROR",
          message: "下書きの取得に失敗しました。",
        }),
      );
    }
  });
}
