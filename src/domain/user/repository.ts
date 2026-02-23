/**
 * User repository interface
 * Contract for user data persistence
 */

import type { Result } from "@praha/byethrow";
import type { User } from "./schema";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { RepositoryError } from "@/domain/shared/repository";
import type { CommitteeRole, GlobalRole } from "@/domain/authorization/schema";

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
   * Upsert committee role assignment
   * If the assignment already exists, update it; otherwise, create it
   *
   * @param userId - User ID
   * @param eventId - Event ID
   * @param role - Committee role to assign
   * @returns Success or repository error
   */
  upsertCommitteeRole(
    userId: UserId,
    eventId: EventId,
    role: CommitteeRole,
  ): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Update user's global role
   *
   * @param userId - User ID
   * @param role - Global role to assign (admin or user)
   * @returns Success or repository error
   */
  updateGlobalRole(userId: UserId, role: GlobalRole): Promise<Result.Result<void, RepositoryError>>;
}
