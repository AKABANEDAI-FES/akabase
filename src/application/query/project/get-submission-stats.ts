import { z } from "zod";
import { projectSubmissions, projects } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import { eventResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";
import { Result } from "@praha/byethrow";
import { QueryException } from "../shared";

/**
 * DTO schema for submission statistics
 */
export const submissionStatsSchema = z.object({
  submitted: z.number(),
  approved: z.number(),
  returned: z.number(),
  withdrawn: z.number(),
});

export type SubmissionStats = z.infer<typeof submissionStatsSchema>;

/**
 * Get submission statistics for an event
 *
 * Counts projects by their latest submission status (submitted/approved/returned/withdrawn).
 *
 * Authorization: Committee members (admin/approver/member) via event:list_submissions
 *
 * @throws {QueryException} When authorization fails or database operation fails
 */
export async function getSubmissionStats(
  deps: Pick<Dependencies, "db" | "authService">,
  eventId: EventId,
  actor: Actor,
): Promise<SubmissionStats> {
  const authResult = deps.authService.enforce(
    actor,
    eventResource(eventId),
    "event:list_submissions",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    // Get latest submission status per project using subquery for max submittedAt
    const latestSubmissionSq = deps.db
      .select({
        projectId: projectSubmissions.projectId,
        maxSubmittedAt: sql<number>`max(${projectSubmissions.submittedAt})`.as("max_submitted_at"),
      })
      .from(projectSubmissions)
      .groupBy(projectSubmissions.projectId)
      .as("latest_sq");

    const statusCounts = await deps.db
      .select({
        status: projectSubmissions.status,
        count: sql<number>`count(*)`,
      })
      .from(projectSubmissions)
      .innerJoin(
        latestSubmissionSq,
        and(
          eq(projectSubmissions.projectId, latestSubmissionSq.projectId),
          eq(projectSubmissions.submittedAt, latestSubmissionSq.maxSubmittedAt),
        ),
      )
      .innerJoin(projects, eq(projectSubmissions.projectId, projects.id))
      .where(eq(projects.eventId, eventId))
      .groupBy(projectSubmissions.status);

    let submitted = 0;
    let approved = 0;
    let returned = 0;
    let withdrawn = 0;
    for (const row of statusCounts) {
      if (row.status === "submitted") submitted = row.count;
      else if (row.status === "approved") approved = row.count;
      else if (row.status === "returned") returned = row.count;
      else if (row.status === "withdrawn") withdrawn = row.count;
    }

    return submissionStatsSchema.parse({
      submitted,
      approved,
      returned,
      withdrawn,
    });
  } catch (error) {
    if (error instanceof QueryException) throw error;
    throw new QueryException("DATABASE_ERROR", "提出統計の取得に失敗しました。", error);
  }
}
