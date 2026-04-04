/**
 * Update organization member role command
 * Updates a member's role in an organization
 */

import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId, OrgMemberRole } from "@akabase/domain/organization/schema";
import type { UserId } from "@akabase/domain/user/schema";
import type { OrganizationError } from "@akabase/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@akabase/domain/organization/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { organizationResource } from "@akabase/domain/authorization/logic";
import { updateOrgMemberEntity } from "@akabase/domain/organization/logic";
import type { OrganizationRepository } from "@akabase/domain/organization/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { OrganizationDomainService } from "@akabase/domain/organization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

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

export async function updateOrganizationMemberRole(
  deps: {
    organizationRepo: OrganizationRepository;
    authService: AuthorizationService;
    organizationDomainService: OrganizationDomainService;
    eventDomainService: EventDomainService;
  },
  input: UpdateOrganizationMemberRoleInput,
): Result.ResultAsync<UpdateOrganizationMemberRoleOutput, UpdateOrganizationMemberRoleError> {
  return Result.gen(async function* ($) {
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

    const resource = organizationResource(input.orgId, input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:manage_members"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const member = yield* $(
      await deps.organizationDomainService.ensureMemberExists(input.orgId, input.userId),
    );
    const updatedMember = yield* $(updateOrgMemberEntity(member, { role: input.role }));

    await deps.organizationRepo.saveMember(updatedMember);

    return { orgId: org.id, eventId: org.eventId };
  });
}
