import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@/domain/organization/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

export type RemoveOrganizationMemberInput = {
  eventId: EventId;
  orgId: OrgId;
  userId: UserId;
  actor: Actor;
};

export type RemoveOrganizationMemberOutput = {
  orgId: OrgId;
  eventId: EventId;
};

export type RemoveOrganizationMemberError = OrganizationError | EventError | AuthorizationError;

/**
 * Remove a member from an organization
 *
 * Business rules:
 * - Only org managers (or global admins) can remove members
 * - Cannot remove the last manager
 */
export async function removeOrganizationMember(
  deps: Pick<
    Dependencies,
    "organizationRepo" | "authService" | "organizationDomainService" | "eventDomainService"
  >,
  input: RemoveOrganizationMemberInput,
): Result.ResultAsync<RemoveOrganizationMemberOutput, RemoveOrganizationMemberError> {
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

    // Check domain invariant: user is a member
    yield* $(await deps.organizationDomainService.ensureCanRemoveMember(input.orgId, input.userId));

    // Remove member
    await deps.organizationRepo.removeMember(input.orgId, input.userId);

    return { orgId: org.id, eventId: org.eventId };
  });
}
