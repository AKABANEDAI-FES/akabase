/**
 * Update organization command
 * Updates an existing organization's name and description
 */

import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { OrganizationError } from "@akabase/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@akabase/domain/organization/errors";
import type { EventError } from "@akabase/domain/event/errors";
import { updateOrganizationEntity as updateOrganizationLogic } from "@akabase/domain/organization/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { organizationResource } from "@akabase/domain/authorization/logic";
import type { OrganizationRepository } from "@akabase/domain/organization/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type UpdateOrganizationInput = {
  eventId: EventId;
  orgId: OrgId;
  name: string;
  description: string;
  actor: Actor;
};

export type UpdateOrganizationOutput = {
  eventId: EventId;
  organizationId: OrgId;
};

export type UpdateOrganizationError = OrganizationError | EventError | AuthorizationError;

export async function updateOrganization(
  deps: {
    organizationRepo: OrganizationRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpdateOrganizationInput,
): Result.ResultAsync<UpdateOrganizationOutput, UpdateOrganizationError> {
  return Result.gen(async function* ($) {
    const organization = await deps.organizationRepo.findById(input.eventId, input.orgId);

    if (!organization) {
      return yield* $(
        Result.fail(
          organizationError(
            ORGANIZATION_ERROR_CODE.ORGANIZATION_NOT_FOUND,
            "出展団体が見つかりません",
          ),
        ),
      );
    }

    const resource = organizationResource(input.orgId, input.eventId, organization);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const updatedOrg = yield* $(
      updateOrganizationLogic(organization, {
        name: input.name,
        description: input.description,
      }),
    );

    await deps.organizationRepo.saveOrganization(updatedOrg);

    return { organizationId: input.orgId, eventId: input.eventId };
  });
}
