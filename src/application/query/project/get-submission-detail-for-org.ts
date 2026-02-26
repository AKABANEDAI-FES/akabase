import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { submissionActionTypeSchema, submissionStatusSchema } from "@/domain/project/schema";
import {
  orgIdSchema,
  projectIdSchema,
  submissionActionIdSchema,
  submissionIdSchema,
  submissionMessageIdSchema,
  userIdSchema,
} from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId, SubmissionId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { getOrgRoleForOrg } from "@/domain/authorization/logic";
import { QueryException } from "../shared";

/**
 * DTO schema for submission detail (organization member view)
 */
export const submissionDetailForOrgSchema = z.object({
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

export type SubmissionDetailForOrg = z.infer<typeof submissionDetailForOrgSchema>;

/**
 * Get submission detail for organization member view
 *
 * Authorization: Organization members (any role) can view submissions for their org
 */
export async function getSubmissionDetailForOrg(
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  submissionId: SubmissionId,
  actor: Actor,
): Promise<SubmissionDetailForOrg | null> {
  // Authorization: check if actor is a member of this organization
  const orgRole = getOrgRoleForOrg(actor, orgId);
  if (orgRole === null) {
    throw new QueryException("VALIDATION_ERROR", "この団体のメンバーのみアクセス可能です。");
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

    // Verify submission exists and belongs to the correct org/event/project
    if (
      !submission ||
      submission.project.eventId !== eventId ||
      submission.project.orgId !== orgId ||
      submission.projectId !== projectId
    ) {
      return null;
    }

    const approvalCount = submission.actions.filter((a) => a.actionType === "approved").length;

    return submissionDetailForOrgSchema.parse({
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
