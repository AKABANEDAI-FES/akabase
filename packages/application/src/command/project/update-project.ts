/**
 * Update project command
 * Updates a project's metadata (name, placeId, logoImageId)
 */

import { Result } from "@archive/result";
import type { EventId, PlaceId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import type { ImageId, ImageRepository } from "@archive/domain/shared/image";
import type { ProjectError } from "@archive/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@archive/domain/project/errors";
import type { EventError } from "@archive/domain/event/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { projectResource } from "@archive/domain/authorization/logic";
import { updateProjectEntity } from "@archive/domain/project/logic";
import type { ProjectRepository } from "@archive/domain/project/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";
import { migrateImageScope } from "../shared/migrate-image-scope";

export type UpdateProjectInput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: PlaceId | null;
  logoImageId: ImageId | null;
  actor: Actor;
};

export type UpdateProjectOutput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
};

export type UpdateProjectError = ProjectError | EventError | AuthorizationError;

export async function updateProject(
  deps: {
    projectRepo: ProjectRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
    imageRepo: ImageRepository;
  },
  input: UpdateProjectInput,
): Result.ResultAsync<UpdateProjectOutput, UpdateProjectError> {
  return Result.gen(async function* ($) {
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    const updatedProject = yield* $(
      updateProjectEntity({
        project,
        name: input.name,
        placeId: input.placeId,
        logoImageId: input.logoImageId,
      }),
    );

    await deps.projectRepo.saveProject(updatedProject);

    // Migrate pending image scope to project scope
    if (input.logoImageId) {
      await migrateImageScope(deps, input.logoImageId, {
        type: "project",
        eventId: project.eventId,
        projectId: input.projectId,
      });
    }

    return { projectId: input.projectId, eventId: project.eventId, orgId: project.orgId };
  });
}
