import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { Result } from "@akabase/result";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { submissionIdSchema, submissionStatusSchema } from "@akabase/domain/project/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

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
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
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
    throw new QueryExceptionError("DATABASE_ERROR", "提出一覧の取得に失敗しました。", error);
  }
}
