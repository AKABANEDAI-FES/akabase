import type { Result } from "@praha/byethrow";
import type {
  DraftWithTags,
  Project,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionWithTags,
} from "@/domain/project/schema";
import type {
  DeadlineId,
  EventId,
  OrgId,
  PlaceId,
  ProjectId,
  SubmissionId,
  TagId,
  UserId,
} from "@/domain/shared/ids";
import type { OrgMember, Organization } from "@/domain/organization/schema";
import type { Deadline, Event, Place, Tag } from "@/domain/event/schema";

/**
 * Repository Error
 * Infrastructure layer errors (database, network, etc.)
 */
export type RepositoryErrorCode =
  | "NOT_FOUND"
  | "DATABASE_ERROR"
  | "CONSTRAINT_VIOLATION"
  | "UNKNOWN_ERROR";

export type RepositoryError = {
  code: RepositoryErrorCode;
  message: string;
  originalError?: unknown;
};

export function repositoryError(
  code: RepositoryErrorCode,
  message: string,
  originalError?: unknown,
): RepositoryError {
  return { code, message, originalError };
}

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
   * Save a new project (atomic operation - project + draft)
   */
  saveProject(
    project: Project,
    draft: DraftWithTags,
  ): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update project metadata
   */
  updateProject(project: Project): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update draft
   */
  updateDraft(draft: DraftWithTags): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save submission with tags
   */
  saveSubmissionWithTags(
    submission: SubmissionWithTags,
  ): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update submission (for status changes)
   */
  updateSubmission(submission: ProjectSubmission): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save or update published data
   */
  savePublished(published: PublishedWithTags): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update active submission ID
   */
  updateActiveSubmissionId(
    projectId: ProjectId,
    submissionId: SubmissionId | null,
  ): Promise<Result.Result<void, RepositoryError>>;
}

/**
 * =============================================================================
 * Organization Repository
 * =============================================================================
 */

export interface OrganizationRepository {
  /**
   * Find organization by ID
   */
  findById(id: OrgId): Promise<Result.Result<Organization | null, RepositoryError>>;

  /**
   * Find organization members
   */
  findMembers(orgId: OrgId): Promise<Result.Result<OrgMember[], RepositoryError>>;

  /**
   * List all organizations for an event
   */
  listByEvent(eventId: EventId): Promise<Result.Result<Organization[], RepositoryError>>;

  /**
   * Save a new organization
   */
  saveOrganization(org: Organization): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update organization
   */
  updateOrganization(org: Organization): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Add a member
   */
  addMember(member: OrgMember): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Remove a member
   */
  removeMember(orgId: OrgId, userId: UserId): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update member role
   */
  updateMemberRole(
    orgId: OrgId,
    userId: UserId,
    role: "manager" | "editor",
  ): Promise<Result.Result<void, RepositoryError>>;
}

/**
 * =============================================================================
 * Event Repository
 * =============================================================================
 */

export interface EventRepository {
  /**
   * Find event by ID
   */
  findById(id: EventId): Promise<Result.Result<Event | null, RepositoryError>>;

  /**
   * Find event by slug
   */
  findBySlug(slug: string): Promise<Result.Result<Event | null, RepositoryError>>;

  /**
   * List all events
   */
  listAll(): Promise<Result.Result<Event[], RepositoryError>>;

  /**
   * Find all tags for an event
   */
  findTags(eventId: EventId): Promise<Result.Result<Tag[], RepositoryError>>;

  /**
   * Find all places for an event
   */
  findPlaces(eventId: EventId): Promise<Result.Result<Place[], RepositoryError>>;

  /**
   * Find all deadlines for an event
   */
  findDeadlines(eventId: EventId): Promise<Result.Result<Deadline[], RepositoryError>>;

  /**
   * Save a new event
   */
  saveEvent(event: Event): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update event
   */
  updateEvent(event: Event): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save a new tag
   */
  saveTag(tag: Tag): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update tag
   */
  updateTag(tag: Tag): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Delete tag
   */
  deleteTag(tagId: TagId): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save a new place
   */
  savePlace(place: Place): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update place
   */
  updatePlace(place: Place): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Delete place
   */
  deletePlace(placeId: PlaceId): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save or update deadline
   */
  saveDeadline(deadline: Deadline): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Delete deadline
   */
  deleteDeadline(deadlineId: DeadlineId): Promise<Result.Result<void, RepositoryError>>;
}

/**
 * =============================================================================
 * User Repository
 * =============================================================================
 */

export interface UserRepository {
  /**
   * Find user by ID
   */
  findById(
    id: UserId,
  ): Promise<Result.Result<{ id: UserId; email: string; name: string } | null, RepositoryError>>;

  /**
   * Find user by email
   */
  findByEmail(
    email: string,
  ): Promise<Result.Result<{ id: UserId; email: string; name: string } | null, RepositoryError>>;
}
