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
  createApprovalActionEntity,
  createPublishedEntity,
  createSubmissionMessageEntity,
} from "@/domain/project/logic";
import { REQUIRED_APPROVALS } from "@/domain/project/schema";
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

    // 5. Domain Service: Check if can approve
    yield* $(await deps.projectDomainService.canApprove(input.submissionId, input.actor.userId));

    // 6. Generate IDs
    const approvalActionId = generateId<SubmissionActionId>();

    // 7. Create approval action entity
    const approvalAction = yield* $(
      createApprovalActionEntity({
        actionId: approvalActionId,
        submissionId: input.submissionId,
        userId: input.actor.userId,
      }),
    );

    // 8. Save approval action
    await deps.projectRepo.saveSubmissionAction(approvalAction);

    // 9. Count approvals
    const approvalCount = await deps.projectRepo.countApprovalActions(input.submissionId);

    // 10. Check if threshold reached and auto-update status
    let statusChanged = false;
    if (approvalCount >= REQUIRED_APPROVALS) {
      // Update submission status
      const updatedSubmission = { ...submission, status: "approved" as const };

      // Create Published entity
      const published = yield* $(
        createPublishedEntity({
          submission: updatedSubmission,
          publishedBy: input.actor.userId,
        }),
      );

      // Save both (transaction)
      await deps.projectRepo.saveSubmission(updatedSubmission);
      await deps.projectRepo.savePublished(published);

      statusChanged = true;
    }

    // 11. Optional message
    const trimmedMessage = input.message?.trim();
    if (trimmedMessage) {
      const messageId = generateId<SubmissionMessageId>();
      const submissionMessage = yield* $(
        createSubmissionMessageEntity({
          messageId,
          submissionId: input.submissionId,
          actionId: approvalActionId,
          userId: input.actor.userId,
          message: trimmedMessage,
        }),
      );
      await deps.projectRepo.saveSubmissionMessage(submissionMessage);
    }

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
