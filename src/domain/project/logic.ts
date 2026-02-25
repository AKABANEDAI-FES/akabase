import { Result } from "@praha/byethrow";
import type { DraftWithTags, Project } from "./schema";
import { draftWithTagsSchema, projectSchema } from "./schema";
import type { ProjectError } from "./errors";
import { projectError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";
import type { EventId, OrgId, PlaceId, ProjectId, TagId, UserId } from "../shared/ids";

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
