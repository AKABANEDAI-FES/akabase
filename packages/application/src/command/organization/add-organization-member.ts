/**
 * Add organization member command
 * Adds a new member to an organization
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId, OrgMemberRole } from "@akabase/domain/organization/schema";
import type { OrganizationError } from "@akabase/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@akabase/domain/organization/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { organizationResource } from "@akabase/domain/authorization/logic";
import { createOrgMemberEntity } from "@akabase/domain/organization/logic";
import type { User } from "@akabase/domain/user/schema";
import type { OrganizationRepository } from "@akabase/domain/organization/repository";
import type { UserRepository } from "@akabase/domain/user/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { OrganizationDomainService } from "@akabase/domain/organization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type AddOrganizationMemberInput = {
  eventId: EventId;
  orgId: OrgId;
  email: string;
  role: OrgMemberRole;
  actor: Actor;
};

export type AddOrganizationMemberOutput = {
  orgId: OrgId;
  eventId: EventId;
  user: User;
};

export type AddOrganizationMemberError = OrganizationError | EventError | AuthorizationError;

export async function addOrganizationMember(
  deps: {
    organizationRepo: OrganizationRepository;
    userRepo: UserRepository;
    authService: AuthorizationService;
    organizationDomainService: OrganizationDomainService;
    eventDomainService: EventDomainService;
  },
  input: AddOrganizationMemberInput,
): Result.ResultAsync<AddOrganizationMemberOutput, AddOrganizationMemberError> {
  return Result.gen(async function* ($) {
    const user = await deps.userRepo.findByEmail(input.email);
    if (!user) {
      return yield* $(
        Result.fail(
          organizationError(
            ORGANIZATION_ERROR_CODE.USER_NOT_FOUND,
            "指定されたメールアドレスのユーザーが見つかりません。",
          ),
        ),
      );
    }

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

    yield* $(await deps.organizationDomainService.ensureCanAddMember(input.orgId, user.id));

    const member = yield* $(
      createOrgMemberEntity({
        id: generateId(),
        orgId: input.orgId,
        userId: user.id,
        role: input.role,
      }),
    );

    await deps.organizationRepo.saveMember(member);

    return { orgId: org.id, eventId: org.eventId, user };
  });
}
