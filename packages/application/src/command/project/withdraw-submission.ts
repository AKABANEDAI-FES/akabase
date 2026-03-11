/**
 * Withdraw submission command
 * Withdraws a submission (submitted → withdrawn)
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
  canWithdraw,
  createSubmissionMessageEntity,
  createWithdrawnActionEntity,
} from "@archive/domain/project/logic";
import type { ProjectRepository } from "@archive/domain/project/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";

export type WithdrawSubmissionInput = {
  submissionId: SubmissionId;
  actor: Actor;
  reason?: string;
};

export type WithdrawSubmissionOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
};

export type WithdrawSubmissionError = ProjectError | EventError | AuthorizationError;

export async function withdrawSubmission(
  deps: {
    projectRepo: ProjectRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: WithdrawSubmissionInput,
): Result.ResultAsync<WithdrawSubmissionOutput, WithdrawSubmissionError> {
  return Result.gen(async function* ($) {
    const submission = await deps.projectRepo.findSubmissionById(input.submissionId);
    if (!submission) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.SUBMISSION_NOT_FOUND, "提出が見つかりません")),
      );
    }

    yield* $(canWithdraw(submission));

    const project = await deps.projectRepo.findById(submission.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    const resource = projectResource(project.id, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:withdraw"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    const actionId = generateId<SubmissionActionId>();
    const messageId = input.reason ? generateId<SubmissionMessageId>() : null;

    const withdrawalAction = yield* $(
      createWithdrawnActionEntity({
        actionId,
        submissionId: input.submissionId,
        userId: input.actor.userId,
      }),
    );

    let withdrawalMessage = undefined;
    if (input.reason && messageId) {
      withdrawalMessage = yield* $(
        createSubmissionMessageEntity({
          messageId,
          submissionId: input.submissionId,
          actionId: actionId,
          userId: input.actor.userId,
          message: input.reason,
        }),
      );
    }

    const updatedSubmission = {
      ...submission,
      status: "withdrawn" as const,
    };

    await deps.projectRepo.withdrawWithTransaction({
      updatedSubmission,
      withdrawalAction,
      withdrawalMessage,
    });

    return {
      eventId: project.eventId,
      orgId: project.orgId,
      projectId: project.id,
      submissionId: submission.id,
    };
  });
}
