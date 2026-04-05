/**
 * Withdraw submission command
 * Withdraws a submission (submitted → withdrawn)
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
  canWithdraw,
  createSubmissionMessageEntity,
  createWithdrawnActionEntity,
} from "@akabase/domain/project/logic";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

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
