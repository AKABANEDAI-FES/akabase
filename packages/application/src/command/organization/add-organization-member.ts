/**
 * Add organization member command
 * Adds a new member to an organization
 */

import { Result } from "@archive/result";
import { generateId } from "@archive/domain/shared/ids";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId, OrgMemberRole } from "@archive/domain/organization/schema";
import type { OrganizationError } from "@archive/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@archive/domain/organization/errors";
import type { EventError } from "@archive/domain/event/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { organizationResource } from "@archive/domain/authorization/logic";
import { createOrgMemberEntity } from "@archive/domain/organization/logic";
import type { User } from "@archive/domain/user/schema";
import type { OrganizationRepository } from "@archive/domain/organization/repository";
import type { UserRepository } from "@archive/domain/user/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { OrganizationDomainService } from "@archive/domain/organization/service";
import type { EventDomainService } from "@archive/domain/event/service";

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
