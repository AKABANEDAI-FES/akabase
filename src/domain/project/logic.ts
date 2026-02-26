import { Result } from "@praha/byethrow";
import type { DraftWithTags, Project, SubmissionAction, SubmissionWithTags } from "./schema";
import {
  draftWithTagsSchema,
  projectSchema,
  submissionActionSchema,
  submissionWithTagsSchema,
} from "./schema";
import type { ProjectError } from "./errors";
import { projectError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";
import type {
  EventId,
  OrgId,
  PlaceId,
  ProjectId,
  SubmissionActionId,
  SubmissionId,
  TagId,
  UserId,
} from "../shared/ids";

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
  logoKey: string | null;
  now?: Date;
}): Result.Result<Project, ProjectError> {
  const now = input.now ?? new Date();
  const data = {
    id: input.id,
    eventId: input.eventId,
    orgId: input.orgId,
    name: input.name,
    placeId: input.placeId,
    logoKey: input.logoKey,
    createdAt: now,
    updatedAt: now,
  };

  return Result.try({
    try: () => projectSchema.parse(data),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "企画の作成に失敗しました"),
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
 * - Validation is performed by zod schema (e.g., pamphletText max 120 chars)
 */
export function updateProjectDraftEntity(input: {
  projectId: ProjectId;
  pamphletText: string;
  webContentJson: unknown | null;
  tags: TagId[];
  updatedBy: UserId;
  now?: Date;
}): Result.Result<DraftWithTags, ProjectError> {
  const now = input.now ?? new Date();
  const data = {
    projectId: input.projectId,
    pamphletText: input.pamphletText,
    webContentJson: input.webContentJson,
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
