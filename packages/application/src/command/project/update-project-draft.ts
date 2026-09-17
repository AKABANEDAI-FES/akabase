/**
 * Update project draft command
 * Updates a project's draft content with deadline enforcement
 */

import { Result } from "@akabase/result";
import type { EventId, TagId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { DraftWithTags, ProjectId } from "@akabase/domain/project/schema";
import { resolvePamphletTextMaxLength } from "@akabase/domain/project/schema";
import type { ProjectError } from "@akabase/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@akabase/domain/project/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { projectResource } from "@akabase/domain/authorization/logic";
import { updateProjectDraftEntity } from "@akabase/domain/project/logic";
import { getBlockedFieldKeys } from "@akabase/domain/event/logic";
import type { ProjectRepository } from "@akabase/domain/project/repository";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type UpdateProjectDraftInput = {
  projectId: ProjectId;
  pamphletText: string;
  webContentJson: unknown;
  openingHours: string;
  tags: TagId[];
  actor: Actor;
};

export type UpdateProjectDraftOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
};

export type UpdateProjectDraftError = ProjectError | EventError | AuthorizationError;

/**
 * Apply deadline enforcement by keeping existing values for blocked fields
 */
function applyDeadlineEnforcement(
  existingDraft: DraftWithTags,
  input: UpdateProjectDraftInput,
  blockedFieldKeys: Set<string>,
): {
  pamphletText: string;
  webContentJson: unknown;
  openingHours: string;
  tags: TagId[];
} {
  return {
    pamphletText: blockedFieldKeys.has("pamphlet_text")
      ? existingDraft.pamphletText
      : input.pamphletText,
    webContentJson: blockedFieldKeys.has("web_content")
      ? existingDraft.webContentJson
      : input.webContentJson,
    openingHours: blockedFieldKeys.has("detail_info")
      ? existingDraft.openingHours
      : input.openingHours,
    tags: blockedFieldKeys.has("tags") ? existingDraft.tags : input.tags,
  };
}

export async function updateProjectDraft(
  deps: {
    projectRepo: ProjectRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
    eventRepo: EventRepository;
  },
  input: UpdateProjectDraftInput,
): Result.ResultAsync<UpdateProjectDraftOutput, UpdateProjectDraftError> {
  return Result.gen(async function* ($) {
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:update_draft"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    const existingDraft = await deps.projectRepo.findDraftWithTags(input.projectId);
    if (!existingDraft) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.DRAFT_NOT_FOUND, "下書きが見つかりません")),
      );
    }

    const deadlines = await deps.eventRepo.findDeadlines(project.eventId);
    const blockedFieldKeys = getBlockedFieldKeys(deadlines, new Date());
    const enforced = applyDeadlineEnforcement(existingDraft, input, blockedFieldKeys);

    const settings = await deps.eventRepo.findEventSettings(project.eventId);
    const pamphletTextMaxLength = resolvePamphletTextMaxLength(settings);

    const updatedDraft = yield* $(
      updateProjectDraftEntity({
        projectId: input.projectId,
        pamphletText: enforced.pamphletText,
        pamphletTextMaxLength,
        webContentJson: enforced.webContentJson,
        openingHours: enforced.openingHours,
        tags: enforced.tags,
        updatedBy: input.actor.userId,
      }),
    );

    await deps.projectRepo.saveDraft(updatedDraft);

    return { projectId: project.id, eventId: project.eventId, orgId: project.orgId };
  });
}
