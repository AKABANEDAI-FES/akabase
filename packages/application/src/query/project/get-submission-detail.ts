import { z } from "zod";
import { eq } from "drizzle-orm";
import { Result } from "@archive/result";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import { cast } from "@archive/domain/shared/ids";
import type { EventId } from "@archive/domain/event/schema";
import { orgIdSchema } from "@archive/domain/organization/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId, SubmissionId } from "@archive/domain/project/schema";
import {
  projectIdSchema,
  submissionActionIdSchema,
  submissionActionTypeSchema,
  submissionIdSchema,
  submissionMessageIdSchema,
  submissionStatusSchema,
} from "@archive/domain/project/schema";
import { userIdSchema } from "@archive/domain/user/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import { projectResource } from "@archive/domain/authorization/logic";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import { QueryExceptionError } from "../shared";

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

export async function getSubmissionDetail(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  submissionId: SubmissionId,
  actor: Actor,
): Promise<SubmissionDetail | null> {
  try {
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

    if (!submission || submission.project.eventId !== eventId) {
      return null;
    }

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
        .toSorted((a, b) => a.tag.displayOrder - b.tag.displayOrder)
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
    throw new QueryExceptionError("DATABASE_ERROR", "提出詳細の取得に失敗しました。", error);
  }
}
