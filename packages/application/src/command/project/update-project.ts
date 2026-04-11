/**
 * Update project command
 * Updates a project's metadata (name, placeId, logoImageId)
 */

import { Result } from "@akabase/result";
import type { EventId, PlaceId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import type { ImageId, ImageRepository } from "@akabase/domain/shared/image";
import type { ProjectError } from "@akabase/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@akabase/domain/project/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import { updateProjectEntity } from "@akabase/domain/project/logic";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";
import { migrateImageScope } from "../shared/migrate-image-scope";

export type UpdateProjectInput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: PlaceId | null;
  logoImageId: ImageId | null;
  contestVoteNumber: number | null;
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
        contestVoteNumber: input.contestVoteNumber,
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
