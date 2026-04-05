import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { Result } from "@akabase/result";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const submissionStatsSchema = z.object({
  submitted: z.number(),
  approved: z.number(),
  returned: z.number(),
  withdrawn: z.number(),
});

export type SubmissionStats = z.infer<typeof submissionStatsSchema>;

export async function getSubmissionStats(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  actor: Actor,
): Promise<SubmissionStats> {
  const authResult = deps.authService.enforce(
    actor,
    eventResource(eventId),
    "event:list_submissions",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const latestSubmissionSq = deps.db
      .select({
        projectId: schema.projectSubmissions.projectId,
        maxSubmittedAt: sql<number>`max(${schema.projectSubmissions.submittedAt})`.as(
          "max_submitted_at",
        ),
      })
      .from(schema.projectSubmissions)
      .groupBy(schema.projectSubmissions.projectId)
      .as("latest_sq");

    const statusCounts = await deps.db
      .select({
        status: schema.projectSubmissions.status,
        count: sql<number>`count(*)`,
      })
      .from(schema.projectSubmissions)
      .innerJoin(
        latestSubmissionSq,
        and(
          eq(schema.projectSubmissions.projectId, latestSubmissionSq.projectId),
          eq(schema.projectSubmissions.submittedAt, latestSubmissionSq.maxSubmittedAt),
        ),
      )
      .innerJoin(schema.projects, eq(schema.projectSubmissions.projectId, schema.projects.id))
      .where(eq(schema.projects.eventId, eventId))
      .groupBy(schema.projectSubmissions.status);

    let submitted = 0;
    let approved = 0;
    let returned = 0;
    let withdrawn = 0;
    for (const row of statusCounts) {
      if (row.status === "submitted") {
        submitted = row.count;
      } else if (row.status === "approved") {
        approved = row.count;
      } else if (row.status === "returned") {
        returned = row.count;
      } else if (row.status === "withdrawn") {
        withdrawn = row.count;
      }
    }

    return submissionStatsSchema.parse({
      submitted,
      approved,
      returned,
      withdrawn,
    });
  } catch (error) {
    if (error instanceof QueryExceptionError) {
      throw error;
    }
    throw new QueryExceptionError("DATABASE_ERROR", "提出統計の取得に失敗しました。", error);
  }
}
