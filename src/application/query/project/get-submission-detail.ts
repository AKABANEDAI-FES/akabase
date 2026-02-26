import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import {
  REQUIRED_APPROVALS,
  submissionActionTypeSchema,
  submissionStatusSchema,
} from "@/domain/project/schema";
import {
  orgIdSchema,
  projectIdSchema,
  submissionActionIdSchema,
  submissionIdSchema,
  submissionMessageIdSchema,
  userIdSchema,
} from "@/domain/shared/ids";
import type { EventId, SubmissionId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { getCommitteeRoleForEvent } from "@/domain/authorization/logic";
import { QueryException } from "../shared";

/**
 * DTO schema for submission detail (committee view)
 */
export const submissionDetailSchema = z.object({
  id: submissionIdSchema,
  status: submissionStatusSchema,
  pamphletText: z.string(),
  submittedAt: z.date(),
  submittedBy: z.string(),
  submittedByUserId: userIdSchema,

  projectId: projectIdSchema,
  projectName: z.string(),

  orgId: orgIdSchema,
  orgName: z.string(),

  tags: z.array(z.object({ id: z.string(), name: z.string() })),

  approvalCount: z.number(),
  requiredApprovals: z.number(),

  actions: z.array(
    z.object({
      id: submissionActionIdSchema,
      actionType: submissionActionTypeSchema,
      userId: userIdSchema,
      userName: z.string(),
      createdAt: z.date(),
    }),
  ),

  messages: z.array(
    z.object({
      id: submissionMessageIdSchema,
      actionId: submissionActionIdSchema.nullable(),
      userId: userIdSchema,
      userName: z.string(),
      message: z.string(),
      createdAt: z.date(),
    }),
  ),
});

export type SubmissionDetail = z.infer<typeof submissionDetailSchema>;

/**
 * Get submission detail for committee view
 */
export async function getSubmissionDetail(
  eventId: EventId,
  submissionId: SubmissionId,
  actor: Actor,
): Promise<SubmissionDetail | null> {
  const committeeRole = getCommitteeRoleForEvent(actor, eventId);
  if (committeeRole === "default") {
    throw new QueryException("VALIDATION_ERROR", "委員会メンバーのみアクセス可能です。");
  }

  try {
    const submission = await db.query.projectSubmissions.findFirst({
      where: eq(schema.projectSubmissions.id, submissionId),
      with: {
        project: {
          with: {
            organization: true,
          },
        },
        submittedByUser: true,
        tags: { with: { tag: true } },
        actions: { with: { user: true } },
        messages: { with: { user: true } },
      },
    });

    if (!submission || submission.project.eventId !== eventId) {
      return null;
    }

    const approvalCount = submission.actions.filter((a) => a.actionType === "approved").length;

    return submissionDetailSchema.parse({
      id: submission.id,
      status: submission.status,
      pamphletText: submission.pamphletText,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedByUser.name,
      submittedByUserId: submission.submittedBy,
      projectId: submission.project.id,
      projectName: submission.project.name,
      orgId: submission.project.organization.id,
      orgName: submission.project.organization.name,
      tags: submission.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
      approvalCount,
      requiredApprovals: REQUIRED_APPROVALS,
      actions: submission.actions.map((a) => ({
        id: a.id,
        actionType: a.actionType,
        userId: a.userId,
        userName: a.user.name,
        createdAt: a.createdAt,
      })),
      messages: submission.messages.map((m) => ({
        id: m.id,
        actionId: m.actionId,
        userId: m.userId,
        userName: m.user.name,
        message: m.message,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof QueryException) throw error;
    throw new QueryException("DATABASE_ERROR", "提出詳細の取得に失敗しました。", error);
  }
}
