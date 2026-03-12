/**
 * Approve project command
 * Approves a project submission
 */

import { Result } from "@archive/result";
import { generateId } from "@archive/domain/shared/ids";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type {
  ProjectId,
  SubmissionActionId,
  SubmissionId,
  SubmissionMessageId,
} from "@archive/domain/project/schema";
import type { ProjectError } from "@archive/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@archive/domain/project/errors";
import type { EventError } from "@archive/domain/event/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { projectResource } from "@archive/domain/authorization/logic";
import {
  canApprove,
  createApprovalActionEntity,
  createPublishedEntity,
  createSubmissionMessageEntity,
} from "@archive/domain/project/logic";
import type { ProjectRepository } from "@archive/domain/project/repository";
import type { ProjectDomainService } from "@archive/domain/project/service";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

export type ApproveProjectInput = {
  submissionId: SubmissionId;
  actor: Actor;
  message?: string;
};

export type ApproveProjectOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
};

export type ApproveProjectError = ProjectError | EventError | AuthorizationError;

export async function approveProject(
  deps: {
    projectRepo: ProjectRepository;
    projectDomainService: ProjectDomainService;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: ApproveProjectInput,
): Result.ResultAsync<ApproveProjectOutput, ApproveProjectError> {
  return Result.gen(async function* ($) {
    const submission = await deps.projectRepo.findSubmissionById(input.submissionId);
    if (!submission) {
      return yield* $(
        Result.fail(
          projectError(PROJECT_ERROR_CODE.SUBMISSION_NOT_FOUND, "提出データが見つかりません"),
        ),
      );
    }

    const project = await deps.projectRepo.findById(submission.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    const resource = projectResource(project.id, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:approve"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    yield* $(canApprove(submission));

    const approvalActionId = generateId<SubmissionActionId>();

    const approvalAction = yield* $(
      createApprovalActionEntity({
        actionId: approvalActionId,
        submissionId: input.submissionId,
        userId: input.actor.userId,
      }),
    );

    const updatedSubmission = { ...submission, status: "approved" as const };
    const published = yield* $(
      createPublishedEntity({
        submission: updatedSubmission,
        publishedBy: input.actor.userId,
      }),
    );

    const approvalMessage = input.message?.trim()
      ? yield* $(
          createSubmissionMessageEntity({
            messageId: generateId<SubmissionMessageId>(),
            submissionId: input.submissionId,
            actionId: approvalActionId,
            userId: input.actor.userId,
            message: input.message.trim(),
          }),
        )
      : undefined;

    await deps.projectRepo.approveWithTransaction({
      approvalAction,
      approvalMessage,
      submission,
      published,
    });

    return {
      eventId: project.eventId,
      orgId: project.orgId,
      projectId: project.id,
      submissionId: input.submissionId,
    };
  });
}
