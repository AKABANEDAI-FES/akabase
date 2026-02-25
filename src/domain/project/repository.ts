import type { Result } from "@praha/byethrow";
import type {
  DraftWithTags,
  Project,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionWithTags,
} from "./schema";
import type { OrgId, ProjectId, SubmissionId } from "@/domain/shared/ids";
import type { RepositoryError } from "@/domain/shared/repository";

/**
 * =============================================================================
 * Project Repository
 * =============================================================================
 */

export interface ProjectRepository {
  /**
   * Find project by ID
   */
  findById(id: ProjectId): Promise<Result.Result<Project | null, RepositoryError>>;

  /**
   * Find draft with tags by project ID
   */
  findDraftWithTags(
    projectId: ProjectId,
  ): Promise<Result.Result<DraftWithTags | null, RepositoryError>>;

  /**
   * Find submission by ID
   */
  findSubmissionById(
    id: SubmissionId,
  ): Promise<Result.Result<SubmissionWithTags | null, RepositoryError>>;

  /**
   * Find published data by project ID
   */
  findPublishedByProjectId(
    projectId: ProjectId,
  ): Promise<Result.Result<PublishedWithTags | null, RepositoryError>>;

  /**
   * List all projects for an organization
   */
  listByOrganization(orgId: OrgId): Promise<Result.Result<Project[], RepositoryError>>;

  /**
   * List all submissions for a project
   */
  listSubmissionsByProject(
    projectId: ProjectId,
  ): Promise<Result.Result<ProjectSubmission[], RepositoryError>>;

  /**
   * Save project (insert or update)
   */
  saveProject(project: Project): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save draft (insert or update)
   */
  saveDraft(draft: DraftWithTags): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save submission (insert or update)
   */
  saveSubmission(submission: SubmissionWithTags): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save or update published data
   */
  savePublished(published: PublishedWithTags): Promise<Result.Result<void, RepositoryError>>;
}
