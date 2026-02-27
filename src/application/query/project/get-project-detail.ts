import { z } from "zod";
import { db } from "@/db";
import { projectIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import { projectResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import { Result } from "@praha/byethrow";

/**
 * DTO schema for project detail
 */
export const projectDetailSchema = z.object({
  id: projectIdSchema,
  eventId: z.string(),
  orgId: z.string(),
  name: z.string(),
  placeId: z.string().nullable(),
  placeName: z.string().nullable(),
  logoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectDetail = z.infer<typeof projectDetailSchema>;

/**
 * Get project detail by project ID
 *
 * Authorization: Committee admins or organization managers/editors can read projects
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns Project detail or null if not found
 * @throws {QueryException} When database operation fails or authorization is denied
 */
export async function getProjectDetail(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<ProjectDetail | null> {
  // Authorization check: project:read permission
  const authResult = deps.authService.enforce(
    actor,
    projectResource(projectId, eventId, orgId),
    "project:read",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const project = await db.query.projects.findFirst({
      where: (projects, { eq, and }) =>
        and(eq(projects.id, projectId), eq(projects.eventId, eventId), eq(projects.orgId, orgId)),
      with: {
        place: true,
      },
    });

    if (!project) {
      return null;
    }

    const detail = projectDetailSchema.parse({
      id: project.id,
      eventId: project.eventId,
      orgId: project.orgId,
      name: project.name,
      placeId: project.placeId,
      placeName: project.place?.name ?? null,
      logoKey: project.logoKey,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });

    return detail;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "企画情報の取得に失敗しました。", error);
  }
}
