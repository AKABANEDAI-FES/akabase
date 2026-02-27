import { z } from "zod";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { eventIdSchema, orgIdSchema, placeIdSchema, projectIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import { organizationResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import { Result } from "@praha/byethrow";

/**
 * DTO schema for project list item
 */
export const projectListItemSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string(),
  placeId: placeIdSchema.nullable(),
  placeName: z.string().nullable(),
  logoImageId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

/**
 * List projects for an organization
 *
 * Authorization: Committee members or organization members can read
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns List of projects
 * @throws {QueryException} When database operation fails or authorization is denied
 */
export async function listProjects(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Promise<ProjectListItem[]> {
  // Authorization check: organization:read permission
  const authResult = deps.authService.enforce(
    actor,
    organizationResource(orgId, eventId),
    "organization:read",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await db.query.projects.findMany({
      where: and(eq(projects.orgId, orgId), eq(projects.eventId, eventId)),
      orderBy: [desc(projects.createdAt)],
      with: { place: true },
    });

    const items: ProjectListItem[] = rows.map((row) =>
      projectListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        orgId: row.orgId,
        name: row.name,
        placeId: row.placeId,
        placeName: row.place?.name ?? null,
        logoImageId: row.logoImageId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    );

    return items;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "企画一覧の取得に失敗しました。", error);
  }
}
