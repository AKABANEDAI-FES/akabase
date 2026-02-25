import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { eventIdSchema, orgIdSchema, projectIdSchema } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";

/**
 * DTO schema for project list item
 */
export const projectListItemSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string(),
  placeText: z.string().nullable(),
  logoKey: z.string().nullable(),
  activeSubmissionId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * List projects for an organization
 *
 * @param orgId - Organization ID
 * @returns Result with list of projects or error
 */
export async function listProjects(
  orgId: OrgId,
): Promise<Result.Result<ProjectListItem[], QueryError>> {
  try {
    const rows = await db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      orderBy: [desc(projects.createdAt)],
    });

    const items: ProjectListItem[] = rows.map((row) =>
      projectListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        orgId: row.orgId,
        name: row.name,
        placeText: row.placeText,
        logoKey: row.logoKey,
        activeSubmissionId: row.activeSubmissionId,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }),
    );

    return Result.succeed(items);
  } catch (error) {
    console.error("[Query Error] Failed to list projects", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "企画一覧の取得に失敗しました。",
    });
  }
}
