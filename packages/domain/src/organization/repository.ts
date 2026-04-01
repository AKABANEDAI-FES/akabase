import type { OrgId, OrgMember, Organization } from "./schema";
import type { EventId } from "../event/schema";
import type { UserId } from "../user/schema";

/**
 * =============================================================================
 * Organization Repository
 * =============================================================================
 * Repository methods throw RepositoryExceptionError on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

export type OrganizationRepository = {
  /**
   * Find organization by ID
   * @throws {RepositoryExceptionError} on database errors
   */
  findById(eventId: EventId, id: OrgId): Promise<Organization | null>;

  /**
   * Find organization members
   * @throws {RepositoryExceptionError} on database errors
   */
  findMembers(orgId: OrgId): Promise<OrgMember[]>;

  /**
   * List all organizations for an event
   * @throws {RepositoryExceptionError} on database errors
   */
  listByEvent(eventId: EventId): Promise<Organization[]>;

  /**
   * Save a new organization (upsert)
   * @throws {RepositoryExceptionError} on database errors
   */
  saveOrganization(org: Organization): Promise<void>;

  /**
   * Save member (insert or update)
   * @throws {RepositoryExceptionError} on database errors
   */
  saveMember(member: OrgMember): Promise<void>;

  /**
   * Remove a member
   * @throws {RepositoryExceptionError} on database errors
   */
  removeMember(orgId: OrgId, userId: UserId): Promise<void>;

  /**
   * Delete an organization (scoped by eventId)
   * @throws {RepositoryExceptionError} on database errors
   */
  deleteOrganization(eventId: EventId, id: OrgId): Promise<void>;
};
