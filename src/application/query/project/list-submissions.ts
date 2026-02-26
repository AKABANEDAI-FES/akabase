import { z } from "zod";
import { db } from "@/db";
import { projectSubmissions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { submissionStatusSchema } from "@/domain/project/schema";
import { submissionIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import { projectResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import { Result } from "@praha/byethrow";

/**
 * DTO schema for submission list item
 */
export const submissionListItemSchema = z.object({
  id: submissionIdSchema,
  status: submissionStatusSchema, // "submitted" | "approved" | "returned" | "withdrawn"
  submittedAt: z.date(),
  submittedBy: z.string(), // 提出者名
  currentAction: z
    .object({
      actionType: submissionStatusSchema,
      performedBy: z.string(), // アクション実行者名
      performedAt: z.date(), // アクション実行日時
      message: z.string().nullable(), // このアクションに紐づくメッセージ
    })
    .nullable(),
});

export type SubmissionListItem = z.infer<typeof submissionListItemSchema>;

/**
 * List submissions for a project
 *
 * Authorization: Committee members or organization members can read submissions
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of submissions
 * @throws {QueryException} When database operation fails or authorization is denied
 */
export async function listSubmissions(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<SubmissionListItem[]> {
  // Authorization check: project:read permission
  const authResult = deps.authService.enforce(
    actor,
    projectResource(projectId, eventId, orgId),
    "project:read",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const submissions = await db.query.projectSubmissions.findMany({
      where: eq(projectSubmissions.projectId, projectId),
      orderBy: [desc(projectSubmissions.submittedAt)],
      with: {
        submittedByUser: true, // 提出者情報
        actions: {
          with: {
            user: true, // アクション実行者情報
            messages: true, // このアクションに紐づくメッセージ
          },
        },
      },
    });

    const items: SubmissionListItem[] = submissions.map((sub) => {
      // 現在のステータスに対応するアクションを取得
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

    return items;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "提出一覧の取得に失敗しました。", error);
  }
}
