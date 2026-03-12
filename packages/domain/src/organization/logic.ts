import { Result } from "@archive/result";
import type { OrgId, OrgMember, OrgMemberRole, Organization } from "./schema";
import { orgMemberSchema, organizationSchema } from "./schema";
import type { OrganizationError } from "./errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";
import type { EventId } from "../event/schema";
import type { ImageId } from "../shared/image";
import type { UserId } from "../user/schema";

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
 * Organization Creation
 * =============================================================================
 */

/**
 * Create a new Organization entity
 * Validates input using zod schema
 */
export function createOrganizationEntity(input: {
  id: OrgId;
  eventId: EventId;
  name: string;
  description: string | null;
  logoImageId: ImageId | null;
  now?: Date;
}): Result.Result<Organization, OrganizationError> {
  const now = input.now ?? new Date();
  const data = {
    id: input.id,
    eventId: input.eventId,
    name: input.name,
    description: input.description ?? "",
    logoImageId: input.logoImageId,
    createdAt: now,
    updatedAt: now,
  };

  return Result.try({
    try: () => organizationSchema.parse(data),
    catch: () =>
      organizationError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "出展団体の作成に失敗しました"),
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
export function updateOrganizationEntity(
  org: Organization,
  input: { name?: string; description?: string; logoImageId?: ImageId | null },
): Result.Result<Organization, OrganizationError> {
  // Build updated organization
  const updated = {
    ...org,
    name: input.name ?? org.name,
    description: input.description ?? org.description,
    logoImageId: input.logoImageId != null ? input.logoImageId : org.logoImageId,
    updatedAt: new Date(),
  };

  return Result.try({
    try: () => organizationSchema.parse(updated),
    catch: () =>
      organizationError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "出展団体の更新に失敗しました"),
  });
}
