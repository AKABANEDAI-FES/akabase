/**
 * User repository interface
 * Contract for user data persistence
 *
 * Repository methods throw RepositoryException on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

import type { CommitteeRoleAssignment, User } from "./schema";
import type { EventId, UserId } from "@/domain/shared/ids";

export interface UserRepository {
  /**
   * Find user by ID
   *
   * @param userId - User ID to search for
   * @returns User if found, null otherwise
   * @throws {RepositoryException} on database errors
   */
  findById(userId: UserId): Promise<User | null>;

  /**
   * List all users
   * Used for admin user management
   *
   * @returns List of all users
   * @throws {RepositoryException} on database errors
   */
  listAll(): Promise<User[]>;

  /**
   * Save user (insert or update)
   * Use domain logic functions to compute the user before calling this
   *
   * @param user - User entity to save
   * @throws {RepositoryException} on database errors
   */
  saveUser(user: User): Promise<void>;

  /**
   * Find committee role assignment
   *
   * @param userId - User ID
   * @param eventId - Event ID
   * @returns CommitteeRoleAssignment if found, null otherwise
   * @throws {RepositoryException} on database errors
   */
  findCommitteeRoleAssignment(
    userId: UserId,
    eventId: EventId,
  ): Promise<CommitteeRoleAssignment | null>;

  /**
   * Save committee role assignment (handles INSERT or UPDATE)
   * Use domain logic functions to create or update the assignment before calling this
   *
   * @param assignment - CommitteeRoleAssignment entity to save
   * @throws {RepositoryException} on database errors
   */
  saveCommitteeRoleAssignment(assignment: CommitteeRoleAssignment): Promise<void>;
}
