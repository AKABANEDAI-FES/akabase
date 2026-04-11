import { z } from "zod";
import { Result } from "@akabase/result";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { projectIdSchema } from "@akabase/domain/project/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { ImageRepository } from "@akabase/domain/shared/image";
import { QueryExceptionError } from "../shared";

export const projectDetailSchema = z.object({
  id: projectIdSchema,
  eventId: z.string(),
  orgId: z.string(),
  name: z.string(),
  placeId: z.string().nullable(),
  placeName: z.string().nullable(),
  logoImageId: z.string().nullable(),
  logoUrl: z.string().nullable(),
  contestVoteNumber: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export async function getProjectDetail(
  deps: { db: Database; authService: AuthorizationService; imageRepo: ImageRepository },
  eventId: EventId,
  orgId: OrgId,
  projectId: ProjectId,
  actor: Actor,
): Promise<ProjectDetail | null> {
  const authResult = deps.authService.enforce(
    actor,
    projectResource(projectId, eventId, orgId),
    "project:read",
  );
  if (Result.isFailure(authResult)) {
    return null;
  }

  try {
    const project = await deps.db.query.projects.findFirst({
      where: (projects, { eq, and }) =>
        and(eq(projects.id, projectId), eq(projects.eventId, eventId), eq(projects.orgId, orgId)),
      with: {
        place: true,
        logoImage: true,
      },
    });

    if (!project) {
      return null;
    }

    return projectDetailSchema.parse({
      id: project.id,
      eventId: project.eventId,
      orgId: project.orgId,
      name: project.name,
      placeId: project.placeId,
      placeName: project.place?.name ?? null,
      logoImageId: project.logoImageId,
      logoUrl: project.logoImage ? deps.imageRepo.getPublicUrl(project.logoImage.objectKey) : null,
      contestVoteNumber: project.contestVoteNumber ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "企画情報の取得に失敗しました。", error);
  }
}
