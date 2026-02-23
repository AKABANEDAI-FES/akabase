import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import { organizationError } from "@/domain/organization/errors";
import { updateOrganization as updateOrganizationLogic } from "@/domain/organization/logic";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for updating an organization
 */
export type UpdateOrganizationInput = {
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
export type UpdateOrganizationError = OrganizationError | RepositoryError | AuthorizationError;

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
  deps: Pick<Dependencies, "organizationRepo" | "authService">,
  input: UpdateOrganizationInput,
): Result.ResultAsync<UpdateOrganizationOutput, UpdateOrganizationError> {
  return gen(async function* ($) {
    // Fetch the organization
    const organization = yield* $(await deps.organizationRepo.findById(input.orgId));

    if (!organization) {
      return yield* $(
        Result.fail(organizationError("ORGANIZATION_NOT_FOUND", "団体が見つかりません")),
      );
    }

    // Authorization check: committee admin only
    const resource = organizationResource(input.orgId, organization.eventId, organization);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:update"));

    // Update organization using domain logic (with validation)
    const updatedOrg = yield* $(
      updateOrganizationLogic(organization, {
        name: input.name,
        description: input.description,
      }),
    );

    // Save updated organization to database
    yield* $(await deps.organizationRepo.saveOrganization(updatedOrg));

    return { organizationId: input.orgId, eventId: organization.eventId };
  });
}
