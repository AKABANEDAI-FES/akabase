import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId, ProjectId, TagId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@/domain/project/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import { updatePublishedEntity } from "@/domain/project/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for updating published data
 */
export type UpdatePublishedInput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
  pamphletText: string;
  webContentJson: unknown | null;
  tags: TagId[];
  actor: Actor;
};

/**
 * Output of published update
 */
export type UpdatePublishedOutput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
};

/**
 * Errors that can occur during published update
 */
export type UpdatePublishedError = ProjectError | EventError | AuthorizationError;

/**
 * Update published data (pamphletText, webContentJson, tags)
 *
 * Business rules:
 * - Only committee admins can update published data
 * - Project must exist
 * - Published data must exist
 * - Event must be modifiable (not archived)
 * - pamphletText: max 120 characters (enforced by domain schema)
 * - tags: max 5 (enforced by domain schema)
 *
 * @param deps - Dependencies (projectRepo, authService, eventDomainService)
 * @param input - Published update input
 * @returns Result with project ID or error
 */
export async function updatePublished(
  deps: Pick<Dependencies, "projectRepo" | "authService" | "eventDomainService">,
  input: UpdatePublishedInput,
): Result.ResultAsync<UpdatePublishedOutput, UpdatePublishedError> {
  return gen(async function* ($) {
    // Fetch existing project (for authorization check)
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    // Authorization check: only committee admins can update published data
    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:update"));

    // Check if event is modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    // Fetch existing published data
    const existingPublished = await deps.projectRepo.findPublishedByProjectId(input.projectId);
    if (!existingPublished) {
      return yield* $(
        Result.fail(
          projectError(PROJECT_ERROR_CODE.PUBLISHED_NOT_FOUND, "公開データが見つかりません"),
        ),
      );
    }

    // Create updated published entity (validated by domain logic)
    const updatedPublished = yield* $(
      updatePublishedEntity({
        projectId: input.projectId,
        pamphletText: input.pamphletText,
        webContentJson: input.webContentJson,
        tags: input.tags,
        publishedBy: input.actor.userId,
      }),
    );

    // Save updated published data
    await deps.projectRepo.savePublished(updatedPublished);

    return { projectId: input.projectId, eventId: project.eventId, orgId: project.orgId };
  });
}
