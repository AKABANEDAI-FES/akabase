import type { Result } from "@praha/byethrow";
import type { OrgMember, Organization } from "./schema";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import type { RepositoryError } from "@/domain/shared/repository";

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
   * Save a new organization (upsert)
   */
  saveOrganization(org: Organization): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save member (insert or update)
   */
  saveMember(member: OrgMember): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Remove a member
   */
  removeMember(orgId: OrgId, userId: UserId): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Delete an organization
   */
  deleteOrganization(id: OrgId): Promise<Result.Result<void, RepositoryError>>;
}
