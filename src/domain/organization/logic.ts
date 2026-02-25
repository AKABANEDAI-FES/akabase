import { Result } from "@praha/byethrow";
import type { OrgMember, OrgMemberRole, Organization } from "./schema";
import { orgMemberSchema, organizationSchema } from "./schema";
import type { OrganizationError } from "./errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";
import type { OrgId, UserId } from "../shared/ids";

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
      organizationError(
        ORGANIZATION_ERROR_CODE.USER_ALREADY_MEMBER,
        "このユーザーは既にメンバーです。",
      ),
    );
  }

  return Result.succeed(true);
}

/**
 * Check if member can be removed
 * Rule: Target must be a member
 */
export function canRemoveMember(
  members: OrgMember[],
  targetUserId: UserId,
): Result.Result<true, OrganizationError> {
  const targetMember = members.find((m) => m.userId === targetUserId);

  if (!targetMember) {
    return Result.fail(
      organizationError(
        ORGANIZATION_ERROR_CODE.USER_NOT_MEMBER,
        "このユーザーはメンバーではありません。",
      ),
    );
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
      organizationError(
        ORGANIZATION_ERROR_CODE.USER_NOT_MEMBER,
        "このユーザーはメンバーではありません。",
      ),
    );
  }

  if (member.role !== "manager") {
    return Result.fail(
      organizationError(
        ORGANIZATION_ERROR_CODE.NOT_MANAGER,
        "この操作にはマネージャー権限が必要です。",
      ),
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
 * Create a new OrgMember entity
 * Validates input using zod schema
 */
export function createOrgMemberEntity(input: {
  id: string;
  orgId: OrgId;
  userId: UserId;
  role: OrgMemberRole;
  now?: Date;
}): Result.Result<OrgMember, OrganizationError> {
  const data = {
    id: input.id,
    orgId: input.orgId,
    userId: input.userId,
    role: input.role,
    createdAt: input.now ?? new Date(),
  };

  return Result.try({
    try: () => orgMemberSchema.parse(data),
    catch: () =>
      organizationError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "メンバーの作成に失敗しました"),
  });
}

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
 * Update a member entity's role
 * Validates the updated member against schema
 */
export function updateOrgMemberEntity(
  member: OrgMember,
  input: { role: OrgMemberRole },
): Result.Result<OrgMember, OrganizationError> {
  const data = {
    ...member,
    role: input.role,
  };

  return Result.try({
    try: () => orgMemberSchema.parse(data),
    catch: () =>
      organizationError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "メンバーの更新に失敗しました"),
  });
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
    return Result.fail(organizationError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "入力値が不正です"));
  }

  return Result.succeed(validationResult.data);
}
