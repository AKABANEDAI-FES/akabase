/**
 * Submit project command
 * Submits a project (Draft → Submission)
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type {
  ProjectId,
  SubmissionActionId,
  SubmissionId,
  SubmissionMessageId,
} from "@akabase/domain/project/schema";
import type { ProjectError } from "@akabase/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@akabase/domain/project/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import {
  createSubmissionActionEntity,
  createSubmissionEntity,
  createSubmissionMessageEntity,
} from "@akabase/domain/project/logic";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { ProjectDomainService } from "@akabase/domain/project/service";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type SubmitProjectInput = {
  projectId: ProjectId;
  actor: Actor;
  message?: string;
};

export type SubmitProjectOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
};

export type SubmitProjectError = ProjectError | EventError | AuthorizationError;

export async function submitProject(
  deps: {
    projectRepo: ProjectRepository;
    projectDomainService: ProjectDomainService;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: SubmitProjectInput,
): Result.ResultAsync<SubmitProjectOutput, SubmitProjectError> {
  return Result.gen(async function* ($) {
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:submit"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    const draft = await deps.projectRepo.findDraftWithTags(input.projectId);
    if (!draft) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.DRAFT_NOT_FOUND, "下書きが見つかりません")),
      );
    }

    yield* $(await deps.projectDomainService.canSubmit(input.projectId));

    const submissionId = generateId<SubmissionId>();
    const actionId = generateId<SubmissionActionId>();

    const submission = yield* $(
      createSubmissionEntity({
        draft,
        submissionId,
        submittedBy: input.actor.userId,
      }),
    );

    const action = yield* $(
      createSubmissionActionEntity({
        actionId,
        submissionId,
        userId: input.actor.userId,
      }),
    );

    const submissionMessage = input.message?.trim()
      ? yield* $(
          createSubmissionMessageEntity({
            messageId: generateId<SubmissionMessageId>(),
            submissionId,
            actionId,
            userId: input.actor.userId,
            message: input.message.trim(),
          }),
        )
      : undefined;

    await deps.projectRepo.submitWithTransaction({
      submission,
      submissionAction: action,
      submissionMessage,
    });

    return {
      eventId: project.eventId,
      orgId: project.orgId,
      projectId: project.id,
      submissionId,
    };
  });
}
