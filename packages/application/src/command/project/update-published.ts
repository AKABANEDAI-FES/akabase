/**
 * Update published command
 * Updates published data (pamphletText, webContentJson, tags)
 */

import { Result } from "@akabase/result";
import type { EventId, TagId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import type { ProjectError } from "@akabase/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@akabase/domain/project/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import { updatePublishedEntity } from "@akabase/domain/project/logic";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type UpdatePublishedInput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
  pamphletText: string;
  webContentJson: unknown;
  openingHours: string;
  tags: TagId[];
  actor: Actor;
};

export type UpdatePublishedOutput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
};

export type UpdatePublishedError = ProjectError | EventError | AuthorizationError;

export async function updatePublished(
  deps: {
    projectRepo: ProjectRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdatePublishedInput,
): Result.ResultAsync<UpdatePublishedOutput, UpdatePublishedError> {
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

    const existingPublished = await deps.projectRepo.findPublishedByProjectId(input.projectId);
    if (!existingPublished) {
      return yield* $(
        Result.fail(
          projectError(PROJECT_ERROR_CODE.PUBLISHED_NOT_FOUND, "公開データが見つかりません"),
        ),
      );
    }

    const updatedPublished = yield* $(
      updatePublishedEntity({
        projectId: input.projectId,
        pamphletText: input.pamphletText,
        webContentJson: input.webContentJson,
        openingHours: input.openingHours,
        tags: input.tags,
        publishedBy: input.actor.userId,
      }),
    );

    await deps.projectRepo.savePublished(updatedPublished);

    return { projectId: input.projectId, eventId: project.eventId, orgId: project.orgId };
  });
}
