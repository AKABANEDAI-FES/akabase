import { Result } from "@praha/byethrow";
import type { OrgMember, OrgMemberRole, Organization } from "./schema";
import { organizationSchema } from "./schema";
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
 * Update organization fields
 * Validates the updated organization using zod schema
 * Only specified fields will be updated
 */
export function updateOrganization(
  org: Organization,
  input: { name?: string; description?: string; logoKey?: string | null },
): Result.Result<Organization, OrganizationError> {
  // Build updated organization
  const updated = {
    ...org,
    name: input.name ?? org.name,
    description: input.description ?? org.description,
    logoKey: input.logoKey !== undefined ? input.logoKey : org.logoKey,
    updatedAt: new Date(),
  };

  // Validate using zod schema
  const validationResult = organizationSchema.safeParse(updated);

  if (!validationResult.success) {
    return Result.fail(organizationError("VALIDATION_ERROR", "入力値が不正です"));
  }

  return Result.succeed(validationResult.data);
}
