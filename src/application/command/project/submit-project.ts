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
  createSubmissionActionEntity,
  createSubmissionEntity,
  createSubmissionMessageEntity,
} from "@/domain/project/logic";
import type { SubmissionMessage } from "@/domain/project/schema";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for submitting a project
 */
export type SubmitProjectInput = {
  projectId: ProjectId;
  actor: Actor;
  message?: string;
};

/**
 * Output of project submission
 */
export type SubmitProjectOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
  submissionId: SubmissionId;
};

/**
 * Errors that can occur during submission
 */
export type SubmitProjectError = ProjectError | EventError | AuthorizationError;

/**
 * Submit a project (Draft → Submission)
 *
 * Business rules:
 * - Only organization managers can submit
 * - Draft must exist
 * - No active submission (status='submitted') exists
 * - Event must be modifiable (not archived)
 * - Creates immutable Submission snapshot with status='submitted'
 * - Records "submitted" action in submission_actions
 *
 * @param deps - Dependencies (projectRepo, projectDomainService, authService, eventDomainService)
 * @param input - Submission input
 * @returns Result with submission ID or error
 */
export async function submitProject(
  deps: Pick<
    Dependencies,
    "projectRepo" | "projectDomainService" | "authService" | "eventDomainService"
  >,
  input: SubmitProjectInput,
): Result.ResultAsync<SubmitProjectOutput, SubmitProjectError> {
  return gen(async function* ($) {
    // Fetch project to get eventId and orgId
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    // Authorization check: only managers can submit
    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:submit"));

    // Check if event is modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    // Fetch draft
    const draft = await deps.projectRepo.findDraftWithTags(input.projectId);
    if (!draft) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.DRAFT_NOT_FOUND, "下書きが見つかりません")),
      );
    }

    // Domain Service: Check if can submit
    yield* $(await deps.projectDomainService.canSubmit(input.projectId));

    // Generate IDs
    const submissionId = generateId<SubmissionId>();
    const actionId = generateId<SubmissionActionId>();

    // Create submission entity from draft
    const submission = yield* $(
      createSubmissionEntity({
        draft,
        submissionId,
        submittedBy: input.actor.userId,
      }),
    );

    // Create submission action entity
    const action = yield* $(
      createSubmissionActionEntity({
        actionId,
        submissionId,
        userId: input.actor.userId,
      }),
    );

    // Create optional message (備考)
    const trimmedMessage = input.message?.trim();
    let submissionMessage: SubmissionMessage | undefined;
    if (trimmedMessage) {
      const messageId = generateId<SubmissionMessageId>();
      submissionMessage = yield* $(
        createSubmissionMessageEntity({
          messageId,
          submissionId,
          actionId,
          userId: input.actor.userId,
          message: trimmedMessage,
        }),
      );
    }

    // Save submission, action, and message atomically
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
