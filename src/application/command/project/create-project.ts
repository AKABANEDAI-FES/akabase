import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, OrgId, ProjectId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { projectResource } from "@/domain/authorization/logic";
import { draftWithTagsSchema, projectSchema } from "@/domain/project/schema";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for creating a new project
 */
export type CreateProjectInput = {
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeText: string | null;
  logoKey: string | null;
  actor: Actor;
};

/**
 * Output of project creation
 */
export type CreateProjectOutput = {
  orgId: OrgId;
  projectId: ProjectId;
};

/**
 * Errors that can occur during project creation
 */
export type CreateProjectError = ProjectError | RepositoryError | AuthorizationError;

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
  deps: Pick<Dependencies, "projectRepo" | "authService">,
  input: CreateProjectInput,
): Result.ResultAsync<CreateProjectOutput, CreateProjectError> {
  return gen(async function* ($) {
    // Generate new project ID
    const projectId = generateId<ProjectId>();

    // Authorization check: only committee admins can create projects
    const resource = projectResource(projectId, input.eventId, input.orgId);
    yield* $(deps.authService.enforce(input.actor, resource, "project:create"));

    // Create project entity
    const project = projectSchema.parse({
      id: projectId,
      eventId: input.eventId,
      orgId: input.orgId,
      name: input.name,
      placeText: input.placeText,
      logoKey: input.logoKey,
      activeSubmissionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create draft entity with initial empty values
    const draft = draftWithTagsSchema.parse({
      projectId: projectId,
      pamphletText: "",
      webContentJson: null,
      updatedAt: new Date(),
      updatedBy: input.actor.userId,
      tags: [], // Start with empty tags
    });

    // Save project + draft atomically
    yield* $(await deps.projectRepo.saveProject(project, draft));

    return { orgId: project.orgId, projectId: project.id };
  });
}
