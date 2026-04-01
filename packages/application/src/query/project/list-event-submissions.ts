import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { Result } from "@archive/result";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { orgIdSchema } from "@archive/domain/organization/schema";
import {
  projectIdSchema,
  submissionIdSchema,
  submissionStatusSchema,
} from "@archive/domain/project/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import { eventResource } from "@archive/domain/authorization/logic";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const eventSubmissionListItemSchema = z.object({
  id: submissionIdSchema,
  status: submissionStatusSchema,
  submittedAt: z.date(),
  submittedBy: z.string(),

  projectId: projectIdSchema,
  projectName: z.string(),

  orgId: orgIdSchema,
  orgName: z.string(),
});

export type EventSubmissionListItem = z.infer<typeof eventSubmissionListItemSchema>;

export async function listEventSubmissions(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  actor: Actor,
): Promise<EventSubmissionListItem[]> {
  const authResult = deps.authService.enforce(
    actor,
    eventResource(eventId),
    "event:list_submissions",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db
      .select({
        id: schema.projectSubmissions.id,
        status: schema.projectSubmissions.status,
        submittedAt: schema.projectSubmissions.submittedAt,
        submittedBy: schema.user.name,

        projectId: schema.projects.id,
        projectName: schema.projects.name,

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
    throw new QueryExceptionError("DATABASE_ERROR", "提出一覧の取得に失敗しました。", error);
  }
}
