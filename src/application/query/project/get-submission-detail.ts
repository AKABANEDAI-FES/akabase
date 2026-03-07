import { z } from "zod";
import { schema } from "@/db";
import { eq } from "drizzle-orm";
import { submissionActionTypeSchema, submissionStatusSchema } from "@/domain/project/schema";
import {
  cast,
  orgIdSchema,
  projectIdSchema,
  submissionActionIdSchema,
  submissionIdSchema,
  submissionMessageIdSchema,
  userIdSchema,
} from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId, SubmissionId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import type { Dependencies } from "@/infrastructure/di";
import { Result } from "@praha/byethrow";

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
 * Authorization: Committee members OR organization members can view
 */
export async function getSubmissionDetail(
  deps: Pick<Dependencies, "db" | "authService">,
  eventId: EventId,
  submissionId: SubmissionId,
  actor: Actor,
): Promise<SubmissionDetail | null> {
  try {
    // Fetch submission first to get projectId and orgId
    const submission = await deps.db.query.projectSubmissions.findFirst({
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

    // Verify submission exists and belongs to the correct event
    if (!submission || submission.project.eventId !== eventId) {
      return null;
    }

    // Authorization check using project resource
    const authResult = deps.authService.enforce(
      actor,
      projectResource(
        cast<ProjectId>(submission.project.id),
        cast<EventId>(submission.project.eventId),
        cast<OrgId>(submission.project.organization.id),
      ),
      "project:read",
    );
    if (Result.isFailure(authResult)) {
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
      tags: submission.tags
        .sort((a, b) => a.tag.displayOrder - b.tag.displayOrder)
        .map((t) => ({ id: t.tag.id, name: t.tag.name })),
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
    throw new QueryException("DATABASE_ERROR", "提出詳細の取得に失敗しました。", error);
  }
}
