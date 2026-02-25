import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, OrgId, PlaceId, ProjectId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import type { EventError } from "@/domain/event/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import { createProjectDraftEntity, createProjectEntity } from "@/domain/project/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for creating a new project
 */
export type CreateProjectInput = {
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: PlaceId | null;
  logoKey: string | null;
  actor: Actor;
};

/**
 * Output of project creation
 */
export type CreateProjectOutput = {
  eventId: EventId;
  orgId: OrgId;
  projectId: ProjectId;
};

/**
 * Errors that can occur during project creation
 */
export type CreateProjectError = ProjectError | EventError | RepositoryError | AuthorizationError;

/**
 * Create a new project
 *
 * Business rules:
 * - Only committee admins can create projects
 * - Project and ProjectDraft are created atomically
 * - Draft starts with empty pamphletText (""), null webContentJson, and empty tags
 * - Logo is optional (MVP: always null)
 * - Place is optional
 *
 * @param deps - Dependencies (projectRepo, authService)
 * @param input - Project creation input
 * @returns Result with project ID or error
 */
export async function createProject(
  deps: Pick<Dependencies, "projectRepo" | "authService" | "eventDomainService">,
  input: CreateProjectInput,
): Result.ResultAsync<CreateProjectOutput, CreateProjectError> {
  return gen(async function* ($) {
    // Generate new project ID
    const projectId = generateId<ProjectId>();

    // Authorization check: only committee admins can create projects
    const resource = projectResource(projectId, input.eventId, input.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:create"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Create project entity
    const project = yield* $(
      createProjectEntity({
        id: projectId,
        eventId: input.eventId,
        orgId: input.orgId,
        name: input.name,
        placeId: input.placeId,
        logoKey: input.logoKey,
      }),
    );

    // Create draft entity with initial empty values
    const draft = yield* $(
      createProjectDraftEntity({
        projectId: projectId,
        updatedBy: input.actor.userId,
      }),
    );

    // Save project and draft
    yield* $(await deps.projectRepo.saveProject(project));
    yield* $(await deps.projectRepo.saveDraft(draft));

    return { orgId: project.orgId, projectId: project.id, eventId: project.eventId };
  });
}
