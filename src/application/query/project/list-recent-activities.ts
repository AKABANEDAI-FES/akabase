import { z } from "zod";
import { schema } from "@/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { submissionActionTypeSchema } from "@/domain/project/schema";
import { orgIdSchema, projectIdSchema, submissionIdSchema } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import { QueryException } from "../shared";

export const recentActivitySchema = z.object({
  actionId: z.string(),
  actionType: submissionActionTypeSchema,
  actionAt: z.date(),
  actionByUserName: z.string(),
  projectId: projectIdSchema,
  projectName: z.string(),
  orgId: orgIdSchema,
  orgName: z.string(),
  submissionId: submissionIdSchema,
});

export type RecentActivity = z.infer<typeof recentActivitySchema>;

export async function listRecentActivities(
  deps: Pick<Dependencies, "db">,
  eventId: EventId,
  actor: Actor,
  limit = 5,
): Promise<RecentActivity[]> {
  try {
    // Get organization IDs the user belongs to
    const memberRows = await deps.db
      .select({ orgId: schema.orgMembers.orgId })
      .from(schema.orgMembers)
      .innerJoin(schema.organizations, eq(schema.orgMembers.orgId, schema.organizations.id))
      .where(eq(schema.orgMembers.userId, actor.userId));

    const orgIds = memberRows.map((r) => r.orgId);

    if (orgIds.length === 0) {
      return [];
    }

    const rows = await deps.db
      .select({
        actionId: schema.submissionActions.id,
        actionType: schema.submissionActions.actionType,
        actionAt: schema.submissionActions.createdAt,
        actionByUserName: schema.user.name,
        projectId: schema.projects.id,
        projectName: schema.projects.name,
        orgId: schema.organizations.id,
        orgName: schema.organizations.name,
        submissionId: schema.projectSubmissions.id,
      })
      .from(schema.submissionActions)
      .innerJoin(
        schema.projectSubmissions,
        eq(schema.submissionActions.submissionId, schema.projectSubmissions.id),
      )
      .innerJoin(schema.projects, eq(schema.projectSubmissions.projectId, schema.projects.id))
      .innerJoin(schema.organizations, eq(schema.projects.orgId, schema.organizations.id))
      .innerJoin(schema.user, eq(schema.submissionActions.userId, schema.user.id))
      .where(and(eq(schema.projects.eventId, eventId), inArray(schema.projects.orgId, orgIds)))
      .orderBy(desc(schema.submissionActions.createdAt))
      .limit(limit);

    return rows.map((row) =>
      recentActivitySchema.parse({
        actionId: row.actionId,
        actionType: row.actionType,
        actionAt: row.actionAt,
        actionByUserName: row.actionByUserName,
        projectId: row.projectId,
        projectName: row.projectName,
        orgId: row.orgId,
        orgName: row.orgName,
        submissionId: row.submissionId,
      }),
    );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "最近のアクティビティの取得に失敗しました。", error);
  }
}
