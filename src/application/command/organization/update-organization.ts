import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@/domain/organization/errors";
import type { EventError } from "@/domain/event/errors";
import { updateOrganizationEntity as updateOrganizationLogic } from "@/domain/organization/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for updating an organization
 */
export type UpdateOrganizationInput = {
  eventId: EventId;
  orgId: OrgId;
  name: string;
  description: string;
  actor: Actor;
};

/**
 * Output of organization update
 */
export type UpdateOrganizationOutput = {
  eventId: EventId;
  organizationId: OrgId;
};

/**
 * Errors that can occur during organization update
 */
export type UpdateOrganizationError =
  | OrganizationError
  | EventError
  | RepositoryError
  | AuthorizationError;

/**
 * Update an existing organization
 *
 * Business rules:
 * - Only committee admins can update organizations
 * - Organization must exist
 * - Name: required, 1-100 characters
 * - Description: optional, max 100 characters
 * - updatedAt is automatically updated
 *
 * @param deps - Dependencies (organizationRepo, authService)
 * @param input - Organization update input
 * @returns Result with organization ID or error
 */
export async function updateOrganization(
  deps: Pick<Dependencies, "organizationRepo" | "authService" | "eventDomainService">,
  input: UpdateOrganizationInput,
): Result.ResultAsync<UpdateOrganizationOutput, UpdateOrganizationError> {
  return gen(async function* ($) {
    // Fetch the organization (scoped by eventId)
    const organization = yield* $(await deps.organizationRepo.findById(input.eventId, input.orgId));

    if (!organization) {
      return yield* $(
        Result.fail(
          organizationError(ORGANIZATION_ERROR_CODE.ORGANIZATION_NOT_FOUND, "団体が見つかりません"),
        ),
      );
    }

    // Authorization check: committee admin only
    const resource = organizationResource(input.orgId, input.eventId, organization);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:update"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Update organization using domain logic (with validation)
    const updatedOrg = yield* $(
      updateOrganizationLogic(organization, {
        name: input.name,
        description: input.description,
      }),
    );

    // Save updated organization to database
    yield* $(await deps.organizationRepo.saveOrganization(updatedOrg));

    return { organizationId: input.orgId, eventId: input.eventId };
  });
}
