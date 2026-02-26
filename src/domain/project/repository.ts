import type {
  DraftWithTags,
  Project,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionAction,
  SubmissionMessage,
  SubmissionWithTags,
} from "./schema";
import type { OrgId, ProjectId, SubmissionId, UserId } from "@/domain/shared/ids";

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
   * Find approval action by submission and user
   * Used to check if a user has already approved a submission
   * @throws {RepositoryException} on database errors
   */
  findApprovalAction(submissionId: SubmissionId, userId: UserId): Promise<SubmissionAction | null>;

  /**
   * Count approval actions for a submission
   * @throws {RepositoryException} on database errors
   */
  countApprovalActions(submissionId: SubmissionId): Promise<number>;

  /**
   * Approve submission with transaction safety
   * Atomically: saves approval action, optionally saves approval message, counts approvals,
   * and if threshold reached, updates submission status and saves published data
   * @throws {RepositoryException} on database errors
   */
  approveWithTransaction(params: {
    approvalAction: SubmissionAction;
    approvalMessage?: SubmissionMessage;
    submission: SubmissionWithTags;
    published?: PublishedWithTags;
    requiredApprovals: number;
  }): Promise<{ approvalCount: number; statusChanged: boolean }>;

  /**
   * Return submission with transaction safety
   * Atomically: updates submission status, saves return action, and saves message
   * @throws {RepositoryException} on database errors
   */
  returnWithTransaction(params: {
    updatedSubmission: SubmissionWithTags;
    returnAction: SubmissionAction;
    returnMessage: SubmissionMessage;
  }): Promise<void>;

  /**
   * Withdraw submission with transaction safety
   * Atomically: updates submission status, saves withdrawal action, and optionally saves message
   * @throws {RepositoryException} on database errors
   */
  withdrawWithTransaction(params: {
    updatedSubmission: SubmissionWithTags;
    withdrawalAction: SubmissionAction;
    withdrawalMessage?: SubmissionMessage;
  }): Promise<void>;

  /**
   * Submit project with transaction safety
   * Atomically: saves submission, saves submission action, and optionally saves message
   * @throws {RepositoryException} on database errors
   */
  submitWithTransaction(params: {
    submission: SubmissionWithTags;
    submissionAction: SubmissionAction;
    submissionMessage?: SubmissionMessage;
  }): Promise<void>;
}
