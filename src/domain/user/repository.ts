/**
 * User repository interface
 * Contract for user data persistence
 */

import type { Result } from "@praha/byethrow";
import type { CommitteeRoleAssignment, User } from "./schema";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { RepositoryError } from "@/domain/shared/repository";

export interface UserRepository {
  /**
   * Find user by ID
   *
   * @param userId - User ID to search for
   * @returns User if found, null otherwise
   */
  findById(userId: UserId): Promise<Result.Result<User | null, RepositoryError>>;

  /**
   * List all users
   * Used for admin user management
   *
   * @returns List of all users
   */
  listAll(): Promise<Result.Result<User[], RepositoryError>>;

  /**
   * Save user (insert or update)
   * Use domain logic functions to compute the user before calling this
   *
   * @param user - User entity to save
   * @returns Success or repository error
   */
  saveUser(user: User): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Find committee role assignment
   *
   * @param userId - User ID
   * @param eventId - Event ID
   * @returns CommitteeRoleAssignment if found, null otherwise
   */
  findCommitteeRoleAssignment(
    userId: UserId,
    eventId: EventId,
  ): Promise<Result.Result<CommitteeRoleAssignment | null, RepositoryError>>;

  /**
   * Save committee role assignment (handles INSERT or UPDATE)
   * Use domain logic functions to create or update the assignment before calling this
   *
   * @param assignment - CommitteeRoleAssignment entity to save
   * @returns Success or repository error
   */
  saveCommitteeRoleAssignment(
    assignment: CommitteeRoleAssignment,
  ): Promise<Result.Result<void, RepositoryError>>;
}
