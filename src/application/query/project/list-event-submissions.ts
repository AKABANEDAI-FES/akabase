import { z } from "zod";
import { db, schema } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { REQUIRED_APPROVALS, submissionStatusSchema } from "@/domain/project/schema";
import { orgIdSchema, projectIdSchema, submissionIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { getCommitteeRoleForEvent } from "@/domain/authorization/logic";
import { QueryException } from "../shared";

/**
 * DTO schema for event submission list item
 */
export const eventSubmissionListItemSchema = z.object({
  // Submission info
  id: submissionIdSchema,
  status: submissionStatusSchema,
  submittedAt: z.date(),
  submittedBy: z.string(), // submitter name

  // Project info
  projectId: projectIdSchema,
  projectName: z.string(),

  // Organization info
  orgId: orgIdSchema,
  orgName: z.string(),

  // Approval info
  approvalCount: z.number(),
  requiredApprovals: z.number(), // REQUIRED_APPROVALS constant
});

export type EventSubmissionListItem = z.infer<typeof eventSubmissionListItemSchema>;

/**
 * List all submissions for an event
 *
 * Authorization: Committee members (admin/approver/member) can view all submissions for an event
 *
 * @param eventId - Event ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of submissions for the event
 * @throws {QueryException} When database operation fails or authorization is denied
 */
export async function listEventSubmissions(
  eventId: EventId,
  actor: Actor,
): Promise<EventSubmissionListItem[]> {
  // Authorization check: Committee role check
  const committeeRole = getCommitteeRoleForEvent(actor, eventId);
  if (committeeRole === "default") {
    throw new QueryException("VALIDATION_ERROR", "委員会メンバーのみアクセス可能です。");
  }

  try {
    const approvalCountExpr = sql<number>`
      coalesce(
        (
          select count(distinct ${schema.submissionActions.userId})
          from ${schema.submissionActions}
          where ${schema.submissionActions.submissionId} = ${schema.projectSubmissions.id}
            and ${schema.submissionActions.actionType} = 'approved'
        ),
        0
      )
    `;

    const rows = await db
      .select({
        // Submission info
        id: schema.projectSubmissions.id,
        status: schema.projectSubmissions.status,
        submittedAt: schema.projectSubmissions.submittedAt,
        submittedBy: schema.user.name, // auth-schema 側のフィールド名に合わせて調整（例: displayName 等）

        // Project info
        projectId: schema.projects.id,
        projectName: schema.projects.name,

        // Organization info
        orgId: schema.organizations.id,
        orgName: schema.organizations.name,

        // Approval info
        approvalCount: approvalCountExpr,
      })
      .from(schema.projectSubmissions)
      .innerJoin(schema.projects, eq(schema.projectSubmissions.projectId, schema.projects.id))
      .innerJoin(schema.organizations, eq(schema.projects.orgId, schema.organizations.id))
      .innerJoin(schema.user, eq(schema.projectSubmissions.submittedBy, schema.user.id))
      .where(eq(schema.projects.eventId, eventId))
      .orderBy(desc(schema.projectSubmissions.submittedAt));

    return rows.map((row) =>
      eventSubmissionListItemSchema.parse({
        id: row.id,
        status: row.status,
        submittedAt: row.submittedAt,
        submittedBy: row.submittedBy,
        projectId: row.projectId,
        projectName: row.projectName,
        orgId: row.orgId,
        orgName: row.orgName,
        approvalCount: row.approvalCount,
        requiredApprovals: REQUIRED_APPROVALS,
      }),
    );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "提出一覧の取得に失敗しました。", error);
  }
}
