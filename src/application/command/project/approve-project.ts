import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type {
  EventId,
  OrgId,
  ProjectId,
  SubmissionActionId,
  SubmissionId,
  SubmissionMessageId,
} from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@/domain/project/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import {
  canApprove,
  createApprovalActionEntity,
  createPublishedEntity,
  createSubmissionMessageEntity,
} from "@/domain/project/logic";
import { REQUIRED_APPROVALS } from "@/domain/project/schema";
import type { SubmissionMessage } from "@/domain/project/schema";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for approving a project submission
 */
export type ApproveProjectInput = {
  submissionId: SubmissionId;
  actor: Actor;
  message?: string;
};

/**
 * Output of approval operation
 */
export type ApproveProjectOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
  approvalCount: number;
  statusChanged: boolean;
};

/**
 * Errors that can occur during approval
 */
export type ApproveProjectError = ProjectError | EventError | AuthorizationError;

/**
 * Approve a project submission
 *
 * Business rules:
 * - Only committee members (admin or approver) can approve
 * - Submission status must be 'submitted'
 * - Same user cannot approve twice
 * - Event must be modifiable (not archived)
 * - Records "approved" action in submission_actions
 * - When approval count reaches REQUIRED_APPROVALS:
 *   - Submission status changes to 'approved'
 *   - Published data is created/updated
 *
 * @param deps - Dependencies (projectRepo, projectDomainService, authService, eventDomainService)
 * @param input - Approval input
 * @returns Result with approval details or error
 */
export async function approveProject(
  deps: Pick<
    Dependencies,
    "projectRepo" | "projectDomainService" | "authService" | "eventDomainService"
  >,
  input: ApproveProjectInput,
): Result.ResultAsync<ApproveProjectOutput, ApproveProjectError> {
  return gen(async function* ($) {
    // 1. Fetch submission
    const submission = await deps.projectRepo.findSubmissionById(input.submissionId);
    if (!submission) {
      return yield* $(
        Result.fail(
          projectError(PROJECT_ERROR_CODE.SUBMISSION_NOT_FOUND, "提出データが見つかりません"),
        ),
      );
    }

    // 2. Fetch project to get eventId and orgId for authorization
    const project = await deps.projectRepo.findById(submission.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    // 3. Authorization check
    const resource = projectResource(project.id, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:approve"));

    // 4. Check if event is modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    // 5. Domain Logic: Check submission status
    yield* $(canApprove(submission));

    // 6. Domain Service: Ensure user has not already approved
    yield* $(
      await deps.projectDomainService.ensureUserNotApproved(input.submissionId, input.actor.userId),
    );

    // 7. Generate IDs
    const approvalActionId = generateId<SubmissionActionId>();

    // 8. Create approval action entity
    const approvalAction = yield* $(
      createApprovalActionEntity({
        actionId: approvalActionId,
        submissionId: input.submissionId,
        userId: input.actor.userId,
      }),
    );

    // 9. Create Published entity (prepare in case threshold is reached)
    const updatedSubmission = { ...submission, status: "approved" as const };
    const published = yield* $(
      createPublishedEntity({
        submission: updatedSubmission,
        publishedBy: input.actor.userId,
      }),
    );

    // 10. Create optional approval message
    const trimmedMessage = input.message?.trim();
    let approvalMessage: SubmissionMessage | undefined;
    if (trimmedMessage) {
      const messageId = generateId<SubmissionMessageId>();
      approvalMessage = yield* $(
        createSubmissionMessageEntity({
          messageId,
          submissionId: input.submissionId,
          actionId: approvalActionId,
          userId: input.actor.userId,
          message: trimmedMessage,
        }),
      );
    }

    // 11. Execute approval with transaction safety
    // This atomically: saves approval action, saves message, counts approvals,
    // and if threshold reached, updates status and saves published data
    const { approvalCount, statusChanged } = await deps.projectRepo.approveWithTransaction({
      approvalAction,
      approvalMessage,
      submission,
      published,
      requiredApprovals: REQUIRED_APPROVALS,
    });

    // 12. Return output
    return {
      eventId: project.eventId,
      orgId: project.orgId,
      projectId: project.id,
      submissionId: input.submissionId,
      approvalCount,
      statusChanged,
    };
  });
}
