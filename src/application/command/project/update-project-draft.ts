import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId, ProjectId, TagId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@/domain/project/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import { updateProjectDraftEntity } from "@/domain/project/logic";
import type { Deadline } from "@/domain/event/schema";
import type { DraftWithTags } from "@/domain/project/schema";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for updating a project draft
 */
export type UpdateProjectDraftInput = {
  projectId: ProjectId;
  pamphletText: string;
  webContentJson: unknown | null;
  tags: TagId[];
  actor: Actor;
};

/**
 * Output of draft update
 */
export type UpdateProjectDraftOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
};

/**
 * Errors that can occur during draft update
 */
export type UpdateProjectDraftError = ProjectError | EventError | AuthorizationError;

/**
 * Build a set of blocked field keys based on deadline window
 * Field is blocked if:
 * - now < startAt (not yet open) OR
 * - deadlineAt <= now (deadline passed)
 */
function getBlockedFieldKeys(deadlines: Deadline[], now: Date): Set<string> {
  const keys = new Set<string>();
  for (const deadline of deadlines) {
    const beforeStart = deadline.startAt && now < deadline.startAt;
    const afterDeadline = deadline.deadlineAt <= now;

    if (beforeStart || afterDeadline) {
      keys.add(deadline.fieldKey);
    }
  }
  return keys;
}

/**
 * Apply deadline enforcement by keeping existing values for blocked fields
 */
function applyDeadlineEnforcement(
  existingDraft: DraftWithTags,
  input: UpdateProjectDraftInput,
  blockedFieldKeys: Set<string>,
): { pamphletText: string; webContentJson: unknown | null; tags: TagId[] } {
  return {
    pamphletText: blockedFieldKeys.has("pamphlet_text")
      ? existingDraft.pamphletText
      : input.pamphletText,
    webContentJson: blockedFieldKeys.has("web_content")
      ? existingDraft.webContentJson
      : input.webContentJson,
    tags: blockedFieldKeys.has("tags") ? existingDraft.tags : input.tags,
  };
}

/**
 * Update a project draft
 *
 * Business rules:
 * - Only committee admins can update drafts
 * - Draft must exist (project must exist)
 * - Event must be modifiable (not archived)
 * - Fields past their deadline are silently kept unchanged
 * - Updates only the draft, not the project itself
 * - Validation: pamphletText max 120 chars (enforced by domain schema)
 *
 * @param deps - Dependencies (projectRepo, authService, eventDomainService, eventRepo)
 * @param input - Draft update input
 * @returns Result with project ID or error
 */
export async function updateProjectDraft(
  deps: Pick<Dependencies, "projectRepo" | "authService" | "eventDomainService" | "eventRepo">,
  input: UpdateProjectDraftInput,
): Result.ResultAsync<UpdateProjectDraftOutput, UpdateProjectDraftError> {
  return gen(async function* ($) {
    // Fetch existing project to get eventId and orgId
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    // Authorization check: only committee admins can update drafts
    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project_draft:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    // Verify draft exists
    const existingDraft = await deps.projectRepo.findDraftWithTags(input.projectId);
    if (!existingDraft) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.DRAFT_NOT_FOUND, "下書きが見つかりません")),
      );
    }

    // Deadline enforcement: keep existing values for blocked fields
    const deadlines = await deps.eventRepo.findDeadlines(project.eventId);
    const blockedFieldKeys = getBlockedFieldKeys(deadlines, new Date());
    const enforced = applyDeadlineEnforcement(existingDraft, input, blockedFieldKeys);

    // Create updated draft entity
    const updatedDraft = yield* $(
      updateProjectDraftEntity({
        projectId: input.projectId,
        pamphletText: enforced.pamphletText,
        webContentJson: enforced.webContentJson,
        tags: enforced.tags,
        updatedBy: input.actor.userId,
      }),
    );

    // Save updated draft (project remains unchanged)
    await deps.projectRepo.saveDraft(updatedDraft);

    return { projectId: project.id, eventId: project.eventId, orgId: project.orgId };
  });
}
