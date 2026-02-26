import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@/domain/organization/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import { updateOrgMemberEntity } from "@/domain/organization/logic";
import type { OrgMemberRole } from "@/domain/organization/schema";
import type { Dependencies } from "@/infrastructure/di";

export type UpdateOrganizationMemberRoleInput = {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  role: OrgMemberRole;
  actor: Actor;
};

export type UpdateOrganizationMemberRoleOutput = {
  orgId: OrgId;
  eventId: EventId;
};

export type UpdateOrganizationMemberRoleError = OrganizationError | EventError | AuthorizationError;

/**
 * Update a member's role in an organization
 *
 * Business rules:
 * - Only org managers (or global admins) can update roles
 */
export async function updateOrganizationMemberRole(
  deps: Pick<
    Dependencies,
    "organizationRepo" | "authService" | "organizationDomainService" | "eventDomainService"
  >,
  input: UpdateOrganizationMemberRoleInput,
): Result.ResultAsync<UpdateOrganizationMemberRoleOutput, UpdateOrganizationMemberRoleError> {
  return gen(async function* ($) {
    // Fetch org (scoped by eventId)
    const org = await deps.organizationRepo.findById(input.eventId, input.orgId);

    if (!org) {
      return yield* $(
        Result.fail(
          organizationError(
            ORGANIZATION_ERROR_CODE.ORGANIZATION_NOT_FOUND,
            "出展団体が見つかりません。",
          ),
        ),
      );
    }

    // Authorization check
    const resource = organizationResource(input.orgId, input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:manage_members"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Fetch member and update role via domain logic
    const member = yield* $(
      await deps.organizationDomainService.ensureMemberExists(input.orgId, input.userId),
    );
    const updatedMember = yield* $(updateOrgMemberEntity(member, { role: input.role }));

    // Persist
    await deps.organizationRepo.saveMember(updatedMember);

    return { orgId: org.id, eventId: org.eventId };
  });
}
