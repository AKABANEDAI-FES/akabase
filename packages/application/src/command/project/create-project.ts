/**
 * Create project command
 * Creates a new project with an initial empty draft
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { EventId, PlaceId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import type { ImageId, ImageRepository } from "@akabase/domain/shared/image";
import type { ProjectError } from "@akabase/domain/project/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import { createProjectDraftEntity, createProjectEntity } from "@akabase/domain/project/logic";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";
import type { ProjectDomainService } from "@akabase/domain/project/service";
import { migrateImageScope } from "../shared/migrate-image-scope";

export type CreateProjectInput = {
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: PlaceId | null;
  logoImageId: ImageId | null;
  contestVoteNumber?: string | null;
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
    projectDomainService: ProjectDomainService;
    imageRepo: ImageRepository;
  },
  input: CreateProjectInput,
): Result.ResultAsync<CreateProjectOutput, CreateProjectError> {
  return Result.gen(async function* ($) {
    const projectId = generateId<ProjectId>();

    const resource = projectResource(projectId, input.eventId, input.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:create"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    if (input.contestVoteNumber != null) {
      yield* $(
        await deps.projectDomainService.ensureContestVoteNumberUnique(
          input.eventId,
          input.contestVoteNumber,
        ),
      );
    }

    const project = yield* $(
      createProjectEntity({
        id: projectId,
        eventId: input.eventId,
        orgId: input.orgId,
        name: input.name,
        placeId: input.placeId,
        logoImageId: input.logoImageId,
        contestVoteNumber: input.contestVoteNumber,
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
