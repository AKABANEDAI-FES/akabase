import type {
  DraftWithTags,
  Project,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionAction,
  SubmissionWithTags,
} from "./schema";
import type { OrgId, ProjectId, SubmissionId } from "@/domain/shared/ids";

/**
 * =============================================================================
 * Project Repository
 * =============================================================================
 * Repository methods throw RepositoryException on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

export interface ProjectRepository {
  /**
   * Find project by ID
   * @throws {RepositoryException} on database errors
   */
  findById(id: ProjectId): Promise<Project | null>;

  /**
   * Find draft with tags by project ID
   * @throws {RepositoryException} on database errors
   */
  findDraftWithTags(projectId: ProjectId): Promise<DraftWithTags | null>;

  /**
   * Find submission by ID
   * @throws {RepositoryException} on database errors
   */
  findSubmissionById(id: SubmissionId): Promise<SubmissionWithTags | null>;

  /**
   * Find published data by project ID
   * @throws {RepositoryException} on database errors
   */
  findPublishedByProjectId(projectId: ProjectId): Promise<PublishedWithTags | null>;

  /**
   * List all projects for an organization
   * @throws {RepositoryException} on database errors
   */
  listByOrganization(orgId: OrgId): Promise<Project[]>;

  /**
   * List all submissions for a project
   * @throws {RepositoryException} on database errors
   */
  listSubmissionsByProject(projectId: ProjectId): Promise<ProjectSubmission[]>;

  /**
   * Save project (insert or update)
   * @throws {RepositoryException} on database errors
   */
  saveProject(project: Project): Promise<void>;

  /**
   * Save draft (insert or update)
   * @throws {RepositoryException} on database errors
   */
  saveDraft(draft: DraftWithTags): Promise<void>;

  /**
   * Save submission (insert or update)
   * @throws {RepositoryException} on database errors
   */
  saveSubmission(submission: SubmissionWithTags): Promise<void>;

  /**
   * Save or update published data
   * @throws {RepositoryException} on database errors
   */
  savePublished(published: PublishedWithTags): Promise<void>;

  /**
   * Save submission action (insert only, no update)
   * @throws {RepositoryException} on database errors
   */
  saveSubmissionAction(action: SubmissionAction): Promise<void>;
}
