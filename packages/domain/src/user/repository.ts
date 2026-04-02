/**
 * User repository interface
 * Contract for user data persistence
 *
 * Repository methods throw RepositoryExceptionError on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

import type { CommitteeRoleAssignment, User, UserId } from "./schema";
import type { EventId } from "../event/schema";

export type UserRepository = {
  /**
   * Find user by ID
   *
   * @param userId - User ID to search for
   * @returns User if found, null otherwise
   * @throws {RepositoryExceptionError} on database errors
   */
  findById(userId: UserId): Promise<User | null>;

  /**
   * Find user by email
   *
   * @param email - Email address to search for
   * @returns User if found, null otherwise
   * @throws {RepositoryExceptionError} on database errors
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * List all users
   * Used for admin user management
   *
   * @returns List of all users
   * @throws {RepositoryExceptionError} on database errors
   */
  listAll(): Promise<User[]>;

  /**
   * Save user (insert or update)
   * Use domain logic functions to compute the user before calling this
   *
   * @param user - User entity to save
   * @throws {RepositoryExceptionError} on database errors
   */
  saveUser(user: User): Promise<void>;

  /**
   * Find committee role assignment
   *
   * @param userId - User ID
   * @param eventId - Event ID
   * @returns CommitteeRoleAssignment if found, null otherwise
   * @throws {RepositoryExceptionError} on database errors
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
   * @throws {RepositoryExceptionError} on database errors
   */
  saveCommitteeRoleAssignment(assignment: CommitteeRoleAssignment): Promise<void>;
};
