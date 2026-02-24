import { Result } from "@praha/byethrow";
import type {
  DraftWithTags,
  Project,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionWithTags,
} from "./schema";
import { projectSchema } from "./schema";
import type { ProjectError } from "./errors";
import { PROJECT_ERROR_CODE, projectError } from "./errors";
import type { SubmissionId, UserId } from "../shared/ids";

/**
 * =============================================================================
 * Invariant Checks (Business Rules)
 * =============================================================================
 */

/**
 * Check if project can be submitted
 * Rule: Only one active submission allowed at a time
 */
export function canSubmit(project: Project): Result.Result<true, ProjectError> {
  if (project.activeSubmissionId !== null) {
    return Result.fail(
      projectError(
        PROJECT_ERROR_CODE.ALREADY_SUBMITTED,
        "既に提出済みです。提出中の企画を取り下げてから再提出してください。",
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * Check if submission can be approved
 * Rule: Only "submitted" status can be approved
 */
export function canApprove(submission: ProjectSubmission): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        PROJECT_ERROR_CODE.CANNOT_APPROVE,
        `提出中ではない企画は承認できません。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * Check if submission can be returned
 * Rule: Only "submitted" status can be returned
 */
export function canReturn(submission: ProjectSubmission): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        PROJECT_ERROR_CODE.CANNOT_RETURN,
        `提出中ではない企画は差戻しできません。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * Check if submission can be withdrawn
 * Rule: Only "submitted" status can be withdrawn (not after approval)
 */
export function canWithdraw(submission: ProjectSubmission): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        PROJECT_ERROR_CODE.CANNOT_WITHDRAW,
        `提出中の企画のみ取り下げできます。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * =============================================================================
 * State Transition Functions (Pure Functions)
 * =============================================================================
 */

/**
 * Create submission snapshot from draft
 * This captures the current state of the draft as an immutable submission
 */
export function createSubmissionFromDraft(
  draft: DraftWithTags,
  userId: UserId,
  submissionId: SubmissionId,
): SubmissionWithTags {
  const now = new Date();
  return {
    id: submissionId,
    projectId: draft.projectId,
    status: "submitted",
    pamphletText: draft.pamphletText,
    webContentJson: draft.webContentJson,
    submittedAt: now,
    submittedBy: userId,
    decidedAt: null,
    decidedBy: null,
    tags: draft.tags,
  };
}

/**
 * Update project after submission
 * Sets the active submission ID
 */
export function projectAfterSubmit(project: Project, submissionId: SubmissionId): Project {
  return {
    ...project,
    activeSubmissionId: submissionId,
    updatedAt: new Date(),
  };
}

/**
 * Approve submission
 * Changes status to "approved" and records decision
 */
export function approveSubmission(
  submission: ProjectSubmission,
  userId: UserId,
): ProjectSubmission {
  const now = new Date();
  return {
    ...submission,
    status: "approved",
    decidedAt: now,
    decidedBy: userId,
  };
}

/**
 * Return submission (差戻し)
 * Changes status to "returned" and records decision
 */
export function returnSubmission(submission: ProjectSubmission, userId: UserId): ProjectSubmission {
  const now = new Date();
  return {
    ...submission,
    status: "returned",
    decidedAt: now,
    decidedBy: userId,
  };
}

/**
 * Withdraw submission (取り下げ)
 * Changes status to "withdrawn" and records decision
 */
export function withdrawSubmission(
  submission: ProjectSubmission,
  userId: UserId,
): ProjectSubmission {
  const now = new Date();
  return {
    ...submission,
    status: "withdrawn",
    decidedAt: now,
    decidedBy: userId,
  };
}

/**
 * Create published version from approved submission
 * This becomes the public-facing data
 */
export function createPublishedFromSubmission(
  submission: SubmissionWithTags,
  userId: UserId,
): PublishedWithTags {
  const now = new Date();
  return {
    projectId: submission.projectId,
    pamphletText: submission.pamphletText,
    webContentJson: submission.webContentJson,
    publishedAt: now,
    publishedBy: userId,
    tags: submission.tags,
  };
}

/**
 * Update project after approval
 * Clears the active submission ID
 */
export function projectAfterApprove(project: Project): Project {
  return {
    ...project,
    activeSubmissionId: null,
    updatedAt: new Date(),
  };
}

/**
 * Update project after return (差戻し)
 * Clears the active submission ID to allow re-editing and re-submission
 */
export function projectAfterReturn(project: Project): Project {
  return {
    ...project,
    activeSubmissionId: null,
    updatedAt: new Date(),
  };
}

/**
 * Update project after withdrawal (取り下げ)
 * Clears the active submission ID
 */
export function projectAfterWithdraw(project: Project): Project {
  return {
    ...project,
    activeSubmissionId: null,
    updatedAt: new Date(),
  };
}

/**
 * =============================================================================
 * Project Updates
 * =============================================================================
 */

/**
 * Update project fields
 * Validates the updated project using zod schema
 * Only specified fields will be updated
 */
export function updateProject(
  project: Project,
  input: { name?: string; placeText?: string | null; logoKey?: string | null },
): Result.Result<Project, ProjectError> {
  // Build updated project
  const updated = {
    ...project,
    name: input.name ?? project.name,
    placeText: input.placeText !== undefined ? input.placeText : project.placeText,
    logoKey: input.logoKey !== undefined ? input.logoKey : project.logoKey,
    updatedAt: new Date(),
  };

  // Validate using zod schema
  const validationResult = projectSchema.safeParse(updated);

  if (!validationResult.success) {
    return Result.fail(projectError(PROJECT_ERROR_CODE.VALIDATION_ERROR, "入力値が不正です"));
  }

  return Result.succeed(validationResult.data);
}
