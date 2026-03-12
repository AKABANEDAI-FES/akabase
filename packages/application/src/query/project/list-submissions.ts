import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { Result } from "@archive/result";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import { submissionIdSchema, submissionStatusSchema } from "@archive/domain/project/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import { projectResource } from "@archive/domain/authorization/logic";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import { QueryException } from "../shared";

export const submissionListItemSchema = z.object({
  id: submissionIdSchema,
  status: submissionStatusSchema,
  submittedAt: z.date(),
  submittedBy: z.string(),
  currentAction: z
    .object({
      actionType: submissionStatusSchema,
      performedBy: z.string(),
      performedAt: z.date(),
      message: z.string().nullable(),
    })
    .nullable(),
});

export type SubmissionListItem = z.infer<typeof submissionListItemSchema>;

export async function listSubmissions(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<SubmissionListItem[]> {
  const authResult = deps.authService.enforce(
    actor,
    projectResource(projectId, eventId, orgId),
    "project:read",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const submissions = await deps.db.query.projectSubmissions.findMany({
      where: eq(schema.projectSubmissions.projectId, projectId),
      orderBy: [desc(schema.projectSubmissions.submittedAt)],
      with: {
        submittedByUser: true,
        actions: {
          with: {
            user: true,
            messages: true,
          },
        },
      },
    });

    return submissions.map((sub) => {
      const currentAction = sub.actions.find((a) => a.actionType === sub.status);

      return submissionListItemSchema.parse({
        id: sub.id,
        status: sub.status,
        submittedAt: sub.submittedAt,
        submittedBy: sub.submittedByUser.name,
        currentAction: currentAction
          ? {
              actionType: currentAction.actionType,
              performedBy: currentAction.user.name,
              performedAt: currentAction.createdAt,
              message: currentAction.messages[0]?.message ?? null,
            }
          : null,
      });
    });
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "提出一覧の取得に失敗しました。", error);
  }
}
