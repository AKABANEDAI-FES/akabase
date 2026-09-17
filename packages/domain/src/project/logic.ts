import { Result } from "@akabase/result";
import type {
  DraftWithTags,
  Project,
  ProjectId,
  PublishedWithTags,
  SubmissionAction,
  SubmissionActionId,
  SubmissionId,
  SubmissionMessage,
  SubmissionMessageId,
  SubmissionWithTags,
} from "./schema";
import {
  draftWithTagsSchema,
  pamphletTextMaxLengthMessage,
  projectSchema,
  publishedWithTagsSchema,
  submissionActionSchema,
  submissionMessageSchema,
  submissionWithTagsSchema,
} from "./schema";
import type { ProjectError } from "./errors";
import { PROJECT_ERROR_CODE, projectError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";
import type { EventId, PlaceId, TagId } from "../event/schema";
import type { OrgId } from "../organization/schema";
import type { ImageId } from "../shared/image";
import type { UserId } from "../user/schema";

/**
 * =============================================================================
 * Entity Creation (Factory Functions)
 * =============================================================================
 */

/**
 * Create a new Project entity
 * Validates input using zod schema
 */
export function createProjectEntity(input: {
  id: ProjectId;
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: PlaceId | null;
  logoImageId: ImageId | null;
  contestVoteNumber?: string | null;
  now?: Date;
}): Result.Result<Project, ProjectError> {
  const now = input.now ?? new Date();
  const data = {
    id: input.id,
    eventId: input.eventId,
    orgId: input.orgId,
    name: input.name.trim(),
    placeId: input.placeId,
    logoImageId: input.logoImageId,
    contestVoteNumber: input.contestVoteNumber ?? null,
    createdAt: now,
    updatedAt: now,
  };

  return Result.try({
    try: () => projectSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "企画の作成に失敗しました"),
  });
}

/**
 * Update an existing Project entity
 * Validates input using zod schema
 *
 * Business rules:
 * - name is trimmed before validation
 * - All fields can be updated except id, eventId, orgId, createdAt
 * - updatedAt is automatically set to current time
 */
export function updateProjectEntity(input: {
  project: Project;
  name: string;
  placeId: PlaceId | null;
  logoImageId: ImageId | null;
  contestVoteNumber: string | null;
  now?: Date;
}): Result.Result<Project, ProjectError> {
  const now = input.now ?? new Date();

  return Result.try({
    try: () =>
      projectSchema.parse({
        ...input.project,
        name: input.name.trim(),
        placeId: input.placeId,
        logoImageId: input.logoImageId,
        contestVoteNumber: input.contestVoteNumber,
        updatedAt: now,
      }),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "企画の更新に失敗しました"),
  });
}

/**
 * Create a new ProjectDraft entity with initial empty values
 * Validates input using zod schema
 */
export function createProjectDraftEntity(input: {
  projectId: ProjectId;
  updatedBy: UserId;
  tags?: TagId[];
  now?: Date;
}): Result.Result<DraftWithTags, ProjectError> {
  const now = input.now ?? new Date();
  const data = {
    projectId: input.projectId,
    pamphletText: "",
    webContentJson: null,
    openingHours: "",
    lastEntryTime: "",
    updatedAt: now,
    updatedBy: input.updatedBy,
    tags: input.tags ?? [],
  };

  return Result.try({
    try: () => draftWithTagsSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "下書きの作成に失敗しました"),
  });
}

/**
 * Update an existing ProjectDraft entity
 * Validates input using zod schema
 *
 * Business rules:
 * - Draft must exist before updating
 * - All fields can be updated except projectId
 * - pamphletText is trimmed before validation and saving
 * - pamphletText max length is per-event (event settings)
 */
export function updateProjectDraftEntity(input: {
  projectId: ProjectId;
  pamphletText: string;
  pamphletTextMaxLength: number;
  webContentJson: unknown;
  openingHours: string;
  lastEntryTime: string;
  tags: TagId[];
  updatedBy: UserId;
  now?: Date;
}): Result.Result<DraftWithTags, ProjectError> {
  if (input.pamphletText.trim().length > input.pamphletTextMaxLength) {
    return Result.fail(
      projectError(
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        pamphletTextMaxLengthMessage(input.pamphletTextMaxLength),
      ),
    );
  }

  const now = input.now ?? new Date();
  const data = {
    projectId: input.projectId,
    pamphletText: input.pamphletText.trim(),
    webContentJson: input.webContentJson,
    openingHours: input.openingHours.trim(),
    lastEntryTime: input.lastEntryTime.trim(),
    updatedAt: now,
    updatedBy: input.updatedBy,
    tags: input.tags,
  };

  return Result.try({
    try: () => draftWithTagsSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "下書きの更新に失敗しました"),
  });
}

/**
 * Create SubmissionWithTags entity from DraftWithTags
 *
 * Business rules:
 * - Creates immutable snapshot of draft at submission time
 * - Status is always "submitted" at creation
 * - Tags are copied from draft
 */
export function createSubmissionEntity(input: {
  draft: DraftWithTags;
  submissionId: SubmissionId;
  submittedBy: UserId;
  now?: Date;
}): Result.Result<SubmissionWithTags, ProjectError> {
  const now = input.now ?? new Date();

  const data = {
    id: input.submissionId,
    projectId: input.draft.projectId,
    status: "submitted" as const,
    pamphletText: input.draft.pamphletText,
    webContentJson: input.draft.webContentJson,
    openingHours: input.draft.openingHours,
    lastEntryTime: input.draft.lastEntryTime,
    submittedAt: now,
    submittedBy: input.submittedBy,
    tags: input.draft.tags,
  };

  return Result.try({
    try: () => submissionWithTagsSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "提出データの作成に失敗しました"),
  });
}

/**
 * Create SubmissionAction entity for "submitted" action
 *
 * Records the submission action in submission_actions table
 */
export function createSubmissionActionEntity(input: {
  actionId: SubmissionActionId;
  submissionId: SubmissionId;
  userId: UserId;
  now?: Date;
}): Result.Result<SubmissionAction, ProjectError> {
  const now = input.now ?? new Date();

  const data = {
    id: input.actionId,
    submissionId: input.submissionId,
    actionType: "submitted" as const,
    userId: input.userId,
    createdAt: now,
  };

  return Result.try({
    try: () => submissionActionSchema.parse(data),
    catch: () =>
      projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "提出アクションの作成に失敗しました"),
  });
}

/**
 * Create SubmissionAction entity for "returned" action
 *
 * Records the return action in submission_actions table
 */
export function createReturnedActionEntity(input: {
  actionId: SubmissionActionId;
  submissionId: SubmissionId;
  userId: UserId;
  now?: Date;
}): Result.Result<SubmissionAction, ProjectError> {
  const now = input.now ?? new Date();

  const data = {
    id: input.actionId,
    submissionId: input.submissionId,
    actionType: "returned" as const,
    userId: input.userId,
    createdAt: now,
  };

  return Result.try({
    try: () => submissionActionSchema.parse(data),
    catch: () =>
      projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "差し戻しアクションの作成に失敗しました"),
  });
}

/**
 * Create SubmissionAction entity for "withdrawn" action
 *
 * Records the withdrawal action in submission_actions table
 */
export function createWithdrawnActionEntity(input: {
  actionId: SubmissionActionId;
  submissionId: SubmissionId;
  userId: UserId;
  now?: Date;
}): Result.Result<SubmissionAction, ProjectError> {
  const now = input.now ?? new Date();

  const data = {
    id: input.actionId,
    submissionId: input.submissionId,
    actionType: "withdrawn" as const,
    userId: input.userId,
    createdAt: now,
  };

  return Result.try({
    try: () => submissionActionSchema.parse(data),
    catch: () =>
      projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "取り下げアクションの作成に失敗しました"),
  });
}

/**
 * Create SubmissionMessage entity
 *
 * Records a message (note/remark) linked to a submission and optionally to a specific action
 */
export function createSubmissionMessageEntity(input: {
  messageId: SubmissionMessageId;
  submissionId: SubmissionId;
  actionId: SubmissionActionId | null;
  userId: UserId;
  message: string;
  now?: Date;
}): Result.Result<SubmissionMessage, ProjectError> {
  const now = input.now ?? new Date();

  const data = {
    id: input.messageId,
    submissionId: input.submissionId,
    actionId: input.actionId,
    userId: input.userId,
    message: input.message,
    createdAt: now,
  };

  return Result.try({
    try: () => submissionMessageSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "メッセージの作成に失敗しました"),
  });
}

/**
 * Create SubmissionAction entity for "approved" action
 *
 * Records an approval action in submission_actions table
 * Business rules:
 * - actionType is always "approved"
 * - Each approval is independent (same user can't approve twice on same submission)
 */
export function createApprovalActionEntity(input: {
  actionId: SubmissionActionId;
  submissionId: SubmissionId;
  userId: UserId;
  now?: Date;
}): Result.Result<SubmissionAction, ProjectError> {
  const now = input.now ?? new Date();

  const data = {
    id: input.actionId,
    submissionId: input.submissionId,
    actionType: "approved" as const,
    userId: input.userId,
    createdAt: now,
  };

  return Result.try({
    try: () => submissionActionSchema.parse(data),
    catch: () =>
      projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "承認アクションの作成に失敗しました"),
  });
}

/**
 * Create PublishedWithTags entity from SubmissionWithTags
 *
 * Business rules:
 * - Creates immutable snapshot of approved submission for public display
 * - Tags are copied from submission
 * - publishedBy is the user who triggered the approval that met the threshold
 */
export function createPublishedEntity(input: {
  submission: SubmissionWithTags;
  publishedBy: UserId;
  now?: Date;
}): Result.Result<PublishedWithTags, ProjectError> {
  const now = input.now ?? new Date();

  const data = {
    projectId: input.submission.projectId,
    pamphletText: input.submission.pamphletText,
    webContentJson: input.submission.webContentJson,
    openingHours: input.submission.openingHours,
    lastEntryTime: input.submission.lastEntryTime,
    publishedAt: now,
    publishedBy: input.publishedBy,
    tags: input.submission.tags,
  };

  return Result.try({
    try: () => publishedWithTagsSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "公開データの作成に失敗しました"),
  });
}

/**
 * Update an existing PublishedWithTags entity
 * Validates input using zod schema
 *
 * Business rules:
 * - pamphletText is trimmed before validation
 * - pamphletText max length is per-event (event settings)
 * - publishedAt and publishedBy are updated to reflect the editor
 * - All fields can be updated except projectId
 */
export function updatePublishedEntity(input: {
  projectId: ProjectId;
  pamphletText: string;
  pamphletTextMaxLength: number;
  webContentJson: unknown;
  openingHours: string;
  lastEntryTime: string;
  tags: TagId[];
  publishedBy: UserId;
  now?: Date;
}): Result.Result<PublishedWithTags, ProjectError> {
  if (input.pamphletText.trim().length > input.pamphletTextMaxLength) {
    return Result.fail(
      projectError(
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        pamphletTextMaxLengthMessage(input.pamphletTextMaxLength),
      ),
    );
  }

  const now = input.now ?? new Date();

  const data = {
    projectId: input.projectId,
    pamphletText: input.pamphletText.trim(),
    webContentJson: input.webContentJson,
    openingHours: input.openingHours.trim(),
    lastEntryTime: input.lastEntryTime.trim(),
    tags: input.tags,
    publishedAt: now,
    publishedBy: input.publishedBy,
  };

  return Result.try({
    try: () => publishedWithTagsSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "公開データの更新に失敗しました"),
  });
}

/**
 * =============================================================================
 * Business Rule Validations
 * =============================================================================
 */

/**
 * Check if a draft has all fields required for submission
 *
 * Business rules:
 * - openingHours and lastEntryTime are optional while drafting,
 *   but must be filled in before the draft can be submitted
 *
 * @param draft - The draft to check
 * @returns Result.succeed if submittable, Result.fail with error otherwise
 */
export function validateDraftForSubmission(
  draft: DraftWithTags,
  pamphletTextMaxLength: number,
): Result.Result<true, ProjectError> {
  const missingLabels = [
    ...(draft.openingHours.trim() === "" ? ["開催時間"] : []),
    ...(draft.lastEntryTime.trim() === "" ? ["最終受付時間"] : []),
  ];

  if (missingLabels.length > 0) {
    return Result.fail(
      projectError(
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        `${missingLabels.join("、")}を入力してから提出してください`,
      ),
    );
  }

  if (draft.pamphletText.trim().length > pamphletTextMaxLength) {
    return Result.fail(
      projectError(
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        pamphletTextMaxLengthMessage(pamphletTextMaxLength),
      ),
    );
  }

  return Result.succeed(true);
}

/**
 * Check if a submission can be approved
 *
 * Business rules:
 * - Submission status must be 'submitted'
 * - Cannot approve submissions that are: returned, approved, or withdrawn
 *
 * @param submission - The submission to check
 * @returns Result.succeed if can approve, Result.fail with error otherwise
 */
export function canApprove(submission: SubmissionWithTags): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        PROJECT_ERROR_CODE.CANNOT_APPROVE,
        `承認は提出中(submitted)の提出のみ可能です。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * Check if a submission can be returned
 *
 * Business rules:
 * - Submission status must be 'submitted'
 * - Cannot return submissions that are: approved, withdrawn, or already returned
 *
 * @param submission - The submission to check
 * @returns Result.succeed if can return, Result.fail with error otherwise
 */
export function canReturn(submission: SubmissionWithTags): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        PROJECT_ERROR_CODE.CANNOT_RETURN,
        `差し戻しは提出中(submitted)の提出のみ可能です。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * Check if a submission can be withdrawn
 *
 * Business rules:
 * - Submission status must be 'submitted'
 * - Cannot withdraw submissions that are: approved, returned, or already withdrawn
 * - Withdrawal is performed by organization manager (not committee)
 *
 * @param submission - The submission to check
 * @returns Result.succeed if can withdraw, Result.fail with error otherwise
 */
export function canWithdraw(submission: SubmissionWithTags): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        PROJECT_ERROR_CODE.CANNOT_WITHDRAW,
        `取り下げは提出中(submitted)の提出のみ可能です。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}
