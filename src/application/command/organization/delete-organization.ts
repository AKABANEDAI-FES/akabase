import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@/domain/organization/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Delete organization input
 */
export type DeleteOrganizationInput = {
  orgId: OrgId;
  actor: Actor;
};

export type DeleteOrganizationOutput = {
  success: true;
  eventId: EventId;
};

export type DeleteOrganizationError = OrganizationError | RepositoryError | AuthorizationError;

/**
 * Delete an organization
 *
 * Note: CASCADE deletion will automatically remove projects and members
 */
export async function deleteOrganization(
  deps: Pick<Dependencies, "organizationRepo" | "authService">,
  input: DeleteOrganizationInput,
): Result.ResultAsync<DeleteOrganizationOutput, DeleteOrganizationError> {
  return gen(async function* ($) {
    // Fetch organization to get eventId for authorization
    const organization = yield* $(await deps.organizationRepo.findById(input.orgId));
    if (!organization) {
      return yield* $(
        Result.fail(
          organizationError(ORGANIZATION_ERROR_CODE.ORGANIZATION_NOT_FOUND, "団体が見つかりません"),
        ),
      );
    }

    // Authorization check
    const resource = organizationResource(input.orgId, organization.eventId, organization);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:delete"));

    // Delete organization
    yield* $(await deps.organizationRepo.deleteOrganization(input.orgId));

    return { success: true as const, eventId: organization.eventId };
  });
}
