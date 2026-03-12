/**
 * Create project command
 * Creates a new project with an initial empty draft
 */

import { Result } from "@archive/result";
import { generateId } from "@archive/domain/shared/ids";
import type { EventId, PlaceId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ProjectId } from "@archive/domain/project/schema";
import type { ImageId, ImageRepository } from "@archive/domain/shared/image";
import type { ProjectError } from "@archive/domain/project/errors";
import type { EventError } from "@archive/domain/event/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { projectResource } from "@archive/domain/authorization/logic";
import { createProjectDraftEntity, createProjectEntity } from "@archive/domain/project/logic";
import type { ProjectRepository } from "@archive/domain/project/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";
import { migrateImageScope } from "../shared/migrate-image-scope";

export type CreateProjectInput = {
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: PlaceId | null;
  logoImageId: ImageId | null;
  actor: Actor;
};

export type CreateProjectOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
};

export type CreateProjectError = ProjectError | EventError | AuthorizationError;

export async function createProject(
  deps: {
    projectRepo: ProjectRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
    imageRepo: ImageRepository;
  },
  input: CreateProjectInput,
): Result.ResultAsync<CreateProjectOutput, CreateProjectError> {
  return Result.gen(async function* ($) {
    const projectId = generateId<ProjectId>();

    const resource = projectResource(projectId, input.eventId, input.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:create"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const project = yield* $(
      createProjectEntity({
        id: projectId,
        eventId: input.eventId,
        orgId: input.orgId,
        name: input.name,
        placeId: input.placeId,
        logoImageId: input.logoImageId,
      }),
    );

    const draft = yield* $(
      createProjectDraftEntity({
        projectId: projectId,
        updatedBy: input.actor.userId,
      }),
    );

    await deps.projectRepo.saveProject(project);
    await deps.projectRepo.saveDraft(draft);

    // Migrate pending image scope to project scope
    if (input.logoImageId) {
      await migrateImageScope(deps, input.logoImageId, {
        type: "project",
        eventId: input.eventId,
        projectId,
      });
    }

    return { orgId: project.orgId, projectId: project.id, eventId: project.eventId };
  });
}
