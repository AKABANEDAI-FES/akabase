import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId, PlaceId, ProjectId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import { PROJECT_ERROR_CODE, projectError } from "@/domain/project/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import { updateProjectEntity } from "@/domain/project/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for updating a project
 */
export type UpdateProjectInput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: PlaceId | null;
  actor: Actor;
};

/**
 * Output of project update
 */
export type UpdateProjectOutput = {
  projectId: ProjectId;
  eventId: EventId;
  orgId: OrgId;
};

/**
 * Errors that can occur during project update
 */
export type UpdateProjectError = ProjectError | EventError | AuthorizationError;

/**
 * Update a project's metadata (name, placeId)
 *
 * Business rules:
 * - Only committee admins can update projects
 * - Project must exist
 * - Event must be modifiable (not archived)
 * - name: 1-100 characters (enforced by domain schema)
 *
 * @param deps - Dependencies (projectRepo, authService, eventDomainService)
 * @param input - Project update input
 * @returns Result with project ID or error
 */
export async function updateProject(
  deps: Pick<Dependencies, "projectRepo" | "authService" | "eventDomainService">,
  input: UpdateProjectInput,
): Result.ResultAsync<UpdateProjectOutput, UpdateProjectError> {
  return gen(async function* ($) {
    // Fetch existing project
    const project = await deps.projectRepo.findById(input.projectId);
    if (!project) {
      return yield* $(
        Result.fail(projectError(PROJECT_ERROR_CODE.PROJECT_NOT_FOUND, "企画が見つかりません")),
      );
    }

    // Authorization check: only committee admins can update projects
    const resource = projectResource(input.projectId, project.eventId, project.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:update"));

    // Check if event is modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(project.eventId));

    // Create updated project entity (validated by domain logic)
    const updatedProject = yield* $(
      updateProjectEntity({
        project,
        name: input.name,
        placeId: input.placeId,
      }),
    );

    // Save updated project
    await deps.projectRepo.saveProject(updatedProject);

    return { projectId: input.projectId, eventId: project.eventId, orgId: project.orgId };
  });
}
