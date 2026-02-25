import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { ProjectId, TagId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@/domain/project/errors";
import type { EventError } from "@/domain/event/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import { updateProjectDraftEntity } from "@/domain/project/logic";
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
  projectId: ProjectId;
};

/**
 * Errors that can occur during draft update
 */
export type UpdateProjectDraftError =
  | ProjectError
  | EventError
  | RepositoryError
  | AuthorizationError;

/**
 * Update a project draft
 *
 * Business rules:
 * - Only committee admins can update drafts
 * - Draft must exist (project must exist)
 * - Event must be modifiable (not archived)
 * - Updates only the draft, not the project itself
 * - Validation: pamphletText max 120 chars (enforced by domain schema)
 *
 * @param deps - Dependencies (projectRepo, authService, eventDomainService)
 * @param input - Draft update input
 * @returns Result with project ID or error
 */
export async function updateProjectDraft(
  deps: Pick<Dependencies, "projectRepo" | "authService" | "eventDomainService">,
  input: UpdateProjectDraftInput,
): Result.ResultAsync<UpdateProjectDraftOutput, UpdateProjectDraftError> {
  return gen(async function* ($) {
    // Fetch existing project to get eventId and orgId
    const project = yield* $(await deps.projectRepo.findById(input.projectId));
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
    const existingDraft = yield* $(await deps.projectRepo.findDraftWithTags(input.projectId));
    if (!existingDraft) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.DRAFT_NOT_FOUND, "下書きが見つかりません")),
      );
    }

    // Create updated draft entity
    const updatedDraft = yield* $(
      updateProjectDraftEntity({
        projectId: input.projectId,
        pamphletText: input.pamphletText,
        webContentJson: input.webContentJson,
        tags: input.tags,
        updatedBy: input.actor.userId,
      }),
    );

    // Save updated draft (project remains unchanged)
    yield* $(await deps.projectRepo.saveProject(project, updatedDraft));

    return { projectId: project.id };
  });
}
