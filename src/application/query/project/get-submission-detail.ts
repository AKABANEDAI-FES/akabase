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
import type { EventId, OrgId, SubmissionId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { getCommitteeRoleForEvent, getOrgRoleForOrg } from "@/domain/authorization/logic";
import { QueryException } from "../shared";

/**
 * DTO schema for submission detail
 */
export const submissionDetailSchema = z.object({
  id: submissionIdSchema,
  status: submissionStatusSchema,
  pamphletText: z.string(),
  webContentJson: z.json().nullable(),
  submittedAt: z.date(),
  submittedBy: z.string(),
  submittedByUserId: userIdSchema,

  projectId: projectIdSchema,
  projectName: z.string(),

  orgId: orgIdSchema,
  orgName: z.string(),

  tags: z.array(z.object({ id: z.string(), name: z.string() })),

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
 * Get submission detail
 *
 * Authorization:
 * - If orgId is provided: Committee members OR organization members can view
 * - If orgId is not provided: Committee members only can view
 */
export async function getSubmissionDetail(
  eventId: EventId,
  submissionId: SubmissionId,
  actor: Actor,
  orgId?: OrgId,
): Promise<SubmissionDetail | null> {
  // Authorization: check if actor is committee member OR org member
  const checkCommittee = () => {
    const committeeRole = getCommitteeRoleForEvent(actor, eventId);
    return committeeRole !== "default";
  };
  const checkOrg = () => {
    if (orgId === undefined) return false;
    const orgRole = getOrgRoleForOrg(actor, orgId);
    return orgRole !== null;
  };

  // Must be either committee member or org member
  if (!checkCommittee() && !checkOrg()) {
    throw new QueryException(
      "VALIDATION_ERROR",
      "委員会メンバーまたはこの団体のメンバーのみアクセス可能です。",
    );
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

    // Verify submission exists and belongs to the correct event (and optionally org)
    if (
      !submission ||
      submission.project.eventId !== eventId ||
      (orgId !== undefined && submission.project.orgId !== orgId)
    ) {
      return null;
    }

    return submissionDetailSchema.parse({
      id: submission.id,
      status: submission.status,
      pamphletText: submission.pamphletText,
      webContentJson: submission.webContentJson,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedByUser.name,
      submittedByUserId: submission.submittedBy,
      projectId: submission.project.id,
      projectName: submission.project.name,
      orgId: submission.project.organization.id,
      orgName: submission.project.organization.name,
      tags: submission.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
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
