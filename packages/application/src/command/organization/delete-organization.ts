/**
 * Delete organization command
 * Deletes an organization (CASCADE removes projects and members)
 */

import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { OrganizationError } from "@akabase/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@akabase/domain/organization/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { organizationResource } from "@akabase/domain/authorization/logic";
import type { OrganizationRepository } from "@akabase/domain/organization/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type DeleteOrganizationInput = {
  eventId: EventId;
  orgId: OrgId;
  actor: Actor;
};

export type DeleteOrganizationOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteOrganizationError = OrganizationError | EventError | AuthorizationError;

export async function deleteOrganization(
  deps: {
    organizationRepo: OrganizationRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: DeleteOrganizationInput,
): Result.ResultAsync<DeleteOrganizationOutput, DeleteOrganizationError> {
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
    yield* $(deps.authService.enforce(input.actor, resource, "organization:delete"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    await deps.organizationRepo.deleteOrganization(input.eventId, input.orgId);

    return { success: true as const, eventId: input.eventId };
  });
}
