/**
 * Delete project command
 * Deletes a project (CASCADE removes draft, submissions and published data)
 */

import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import type { ProjectError } from "@akabase/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@akabase/domain/project/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type DeleteProjectInput = {
  projectId: ProjectId;
  actor: Actor;
};

export type DeleteProjectOutput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
};

export type DeleteProjectError = ProjectError | EventError | AuthorizationError;

export async function deleteProject(
  deps: {
    projectRepo: ProjectRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: DeleteProjectInput,
): Result.ResultAsync<DeleteProjectOutput, DeleteProjectError> {
  return Result.gen(async function* ($) {
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:delete"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    await deps.projectRepo.deleteProject(input.projectId);

    return { projectId: input.projectId, eventId: project.eventId, orgId: project.orgId };
  });
}
