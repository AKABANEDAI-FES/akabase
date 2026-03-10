/**
 * User domain logic
 * Pure functions for user and committee role management
 */

import type { CommitteeRoleAssignment, User, UserId } from "./schema";
import type { CommitteeRole, GlobalRole } from "../authorization/roles";
import type { EventId } from "../event/schema";

/**
 * =============================================================================
 * State Transition Functions (Pure Functions)
 * =============================================================================
 */

/**
 * Update user's global role
 * Returns new User entity with updated role and timestamp
 */
export function updateUserGlobalRole(user: User, role: GlobalRole): User {
  return {
    ...user,
    role,
    updatedAt: new Date(),
  };
}

/**
 * Create committee role assignment
 * Returns new CommitteeRoleAssignment entity
 */
export function createCommitteeRoleAssignment(
  id: string,
  eventId: EventId,
  userId: UserId,
  role: CommitteeRole,
): CommitteeRoleAssignment {
  return {
    id,
    eventId,
    userId,
    role,
    createdAt: new Date(),
  };
}

/**
 * Update committee role assignment
 * Returns updated CommitteeRoleAssignment entity
 */
export function updateCommitteeRoleAssignment(
  assignment: CommitteeRoleAssignment,
  role: CommitteeRole,
): CommitteeRoleAssignment {
  return {
    ...assignment,
    role,
  };
}
