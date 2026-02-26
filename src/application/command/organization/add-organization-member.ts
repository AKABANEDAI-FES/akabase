import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@/domain/organization/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import { createOrgMemberEntity } from "@/domain/organization/logic";
import type { OrgMemberRole } from "@/domain/organization/schema";
import type { Dependencies } from "@/infrastructure/di";

export type AddOrganizationMemberInput = {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  role: OrgMemberRole;
  actor: Actor;
};

export type AddOrganizationMemberOutput = {
  orgId: OrgId;
  eventId: EventId;
};

export type AddOrganizationMemberError = OrganizationError | EventError | AuthorizationError;

/**
 * Add a member to an organization
 *
 * Business rules:
 * - Only org managers (or global admins) can add members
 * - Cannot add a user who is already a member
 */
export async function addOrganizationMember(
  deps: Pick<
    Dependencies,
    "organizationRepo" | "authService" | "organizationDomainService" | "eventDomainService"
  >,
  input: AddOrganizationMemberInput,
): Result.ResultAsync<AddOrganizationMemberOutput, AddOrganizationMemberError> {
  return gen(async function* ($) {
    // Fetch org (scoped by eventId)
    const org = await deps.organizationRepo.findById(input.eventId, input.orgId);

    if (!org) {
      return yield* $(
        Result.fail(
          organizationError(
            ORGANIZATION_ERROR_CODE.ORGANIZATION_NOT_FOUND,
            "団体が見つかりません。",
          ),
        ),
      );
    }

    // Authorization check
    const resource = organizationResource(input.orgId, input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:manage_members"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Check domain invariant: user not already a member
    yield* $(await deps.organizationDomainService.ensureCanAddMember(input.orgId, input.userId));

    // Create and persist member
    const member = yield* $(
      createOrgMemberEntity({
        id: generateId(),
        orgId: input.orgId,
        userId: input.userId,
        role: input.role,
      }),
    );

    await deps.organizationRepo.saveMember(member);

    return { orgId: org.id, eventId: org.eventId };
  });
}
