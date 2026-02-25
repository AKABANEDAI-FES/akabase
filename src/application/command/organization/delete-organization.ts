import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@/domain/organization/errors";
import type { EventError } from "@/domain/event/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Delete organization input
 */
export type DeleteOrganizationInput = {
  eventId: EventId;
  orgId: OrgId;
  actor: Actor;
};

export type DeleteOrganizationOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteOrganizationError =
  | OrganizationError
  | EventError
  | RepositoryError
  | AuthorizationError;

/**
 * Delete an organization
 *
 * Note: CASCADE deletion will automatically remove projects and members
 */
export async function deleteOrganization(
  deps: Pick<Dependencies, "organizationRepo" | "authService" | "eventDomainService">,
  input: DeleteOrganizationInput,
): Result.ResultAsync<DeleteOrganizationOutput, DeleteOrganizationError> {
  return gen(async function* ($) {
    // Fetch organization (scoped by eventId)
    const organization = yield* $(await deps.organizationRepo.findById(input.eventId, input.orgId));
    if (!organization) {
      return yield* $(
        Result.fail(
          organizationError(ORGANIZATION_ERROR_CODE.ORGANIZATION_NOT_FOUND, "団体が見つかりません"),
        ),
      );
    }

    // Authorization check
    const resource = organizationResource(input.orgId, input.eventId, organization);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:delete"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Delete organization (scoped by eventId)
    yield* $(await deps.organizationRepo.deleteOrganization(input.eventId, input.orgId));

    return { success: true as const, eventId: input.eventId };
  });
}
