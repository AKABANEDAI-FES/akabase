import { Result } from "@praha/byethrow";
import type { OrgMember, OrgMemberRole, Organization } from "./schema";
import type { OrganizationError } from "./errors";
import { organizationError } from "./errors";
import type { UserId } from "../shared/ids";

/**
 * =============================================================================
 * Invariant Checks (Business Rules)
 * =============================================================================
 */

/**
 * Check if user is already a member
 * Rule: User can only be added once
 */
export function canAddMember(
  members: OrgMember[],
  userId: UserId,
): Result.Result<true, OrganizationError> {
  const existingMember = members.find((m) => m.userId === userId);

  if (existingMember) {
    return Result.fail(
      organizationError("USER_ALREADY_MEMBER", "このユーザーは既にメンバーです。"),
    );
  }

  return Result.succeed(true);
}

/**
 * Check if member can be removed
 * Rule: Cannot remove the last manager
 */
export function canRemoveMember(
  members: OrgMember[],
  targetUserId: UserId,
): Result.Result<true, OrganizationError> {
  const targetMember = members.find((m) => m.userId === targetUserId);

  if (!targetMember) {
    return Result.fail(
      organizationError("USER_NOT_MEMBER", "このユーザーはメンバーではありません。"),
    );
  }

  // If removing a manager, check if they're the last one
  if (targetMember.role === "manager") {
    const managerCount = members.filter((m) => m.role === "manager").length;

    if (managerCount <= 1) {
      return Result.fail(
        organizationError(
          "CANNOT_REMOVE_LAST_MANAGER",
          "最後のマネージャーは削除できません。別のメンバーをマネージャーに昇格させてから削除してください。",
        ),
      );
    }
  }

  return Result.succeed(true);
}

/**
 * Check if user is a manager
 * Rule: Only managers can perform certain operations
 */
export function isManager(
  members: OrgMember[],
  userId: UserId,
): Result.Result<true, OrganizationError> {
  const member = members.find((m) => m.userId === userId);

  if (!member) {
    return Result.fail(
      organizationError("USER_NOT_MEMBER", "このユーザーはメンバーではありません。"),
    );
  }

  if (member.role !== "manager") {
    return Result.fail(
      organizationError("NOT_MANAGER", "この操作にはマネージャー権限が必要です。"),
    );
  }

  return Result.succeed(true);
}

/**
 * =============================================================================
 * Member Management Functions (Pure Functions)
 * =============================================================================
 */

/**
 * Add a new member to the organization
 * Returns new members array
 */
export function addMember(members: OrgMember[], newMember: OrgMember): OrgMember[] {
  return [...members, newMember];
}

/**
 * Remove a member from the organization
 * Returns new members array
 */
export function removeMember(members: OrgMember[], targetUserId: UserId): OrgMember[] {
  return members.filter((m) => m.userId !== targetUserId);
}

/**
 * Update a member's role
 * Returns new members array
 */
export function updateMemberRole(
  members: OrgMember[],
  targetUserId: UserId,
  newRole: OrgMemberRole,
): OrgMember[] {
  return members.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m));
}

/**
 * =============================================================================
 * Organization Updates
 * =============================================================================
 */

/**
 * Update organization name
 */
export function updateOrganizationName(org: Organization, name: string): Organization {
  return {
    ...org,
    name,
    updatedAt: new Date(),
  };
}

/**
 * Update organization description
 * Rule: Maximum 100 characters
 */
export function updateOrganizationDescription(
  org: Organization,
  description: string | null,
): Result.Result<Organization, OrganizationError> {
  if (description !== null && description.length > 100) {
    return Result.fail(
      organizationError(
        "INVALID_ROLE",
        `団体説明は100文字以内で入力してください。現在: ${description.length}文字`,
      ),
    );
  }

  return Result.succeed({
    ...org,
    description,
    updatedAt: new Date(),
  });
}

/**
 * Update organization logo key
 */
export function updateOrganizationLogoKey(org: Organization, logoKey: string | null): Organization {
  return {
    ...org,
    logoKey,
    updatedAt: new Date(),
  };
}
