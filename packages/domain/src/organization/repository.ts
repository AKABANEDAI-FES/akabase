import type { OrgId, OrgMember, Organization } from "./schema";
import type { EventId } from "../event/schema";
import type { UserId } from "../user/schema";

/**
 * =============================================================================
 * Organization Repository
 * =============================================================================
 * Repository methods throw RepositoryException on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

export type OrganizationRepository = {
  /**
   * Find organization by ID
   * @throws {RepositoryException} on database errors
   */
  findById(eventId: EventId, id: OrgId): Promise<Organization | null>;

  /**
   * Find organization members
   * @throws {RepositoryException} on database errors
   */
  findMembers(orgId: OrgId): Promise<OrgMember[]>;

  /**
   * List all organizations for an event
   * @throws {RepositoryException} on database errors
   */
  listByEvent(eventId: EventId): Promise<Organization[]>;

  /**
   * Save a new organization (upsert)
   * @throws {RepositoryException} on database errors
   */
  saveOrganization(org: Organization): Promise<void>;

  /**
   * Save member (insert or update)
   * @throws {RepositoryException} on database errors
   */
  saveMember(member: OrgMember): Promise<void>;

  /**
   * Remove a member
   * @throws {RepositoryException} on database errors
   */
  removeMember(orgId: OrgId, userId: UserId): Promise<void>;

  /**
   * Delete an organization (scoped by eventId)
   * @throws {RepositoryException} on database errors
   */
  deleteOrganization(eventId: EventId, id: OrgId): Promise<void>;
};
