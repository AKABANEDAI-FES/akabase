import { z } from "zod";
import { schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { submissionStatusSchema } from "@/domain/project/schema";
import { orgIdSchema, projectIdSchema, submissionIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import type { Dependencies } from "@/infrastructure/di";
import { Result } from "@praha/byethrow";

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
});

export type EventSubmissionListItem = z.infer<typeof eventSubmissionListItemSchema>;

/**
 * List all submissions for an event
 *
 * Authorization: Committee members (admin/approver/member) can view all submissions for an event
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of submissions for the event
 * @throws {QueryException} When database operation fails or authorization is denied
 */
export async function listEventSubmissions(
  deps: Pick<Dependencies, "db" | "authService">,
  eventId: EventId,
  actor: Actor,
): Promise<EventSubmissionListItem[]> {
  // Authorization check: event:list_submissions permission
  const authResult = deps.authService.enforce(
    actor,
    eventResource(eventId),
    "event:list_submissions",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db
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
      }),
    );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "提出一覧の取得に失敗しました。", error);
  }
}
