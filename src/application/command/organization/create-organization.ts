import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, ImageId, OrgId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import type { EventError } from "@/domain/event/errors";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import { createOrganizationEntity } from "@/domain/organization/logic";
import type { Dependencies } from "@/infrastructure/di";
import { migrateImageScope } from "@/application/command/shared/migrate-image-scope";

/**
 * Input for creating a new organization
 */
export type CreateOrganizationInput = {
  eventId: EventId;
  name: string;
  description: string | null;
  logoImageId: ImageId | null;
  actor: Actor;
};

/**
 * Output of organization creation
 */
export type CreateOrganizationOutput = {
  eventId: EventId;
  organizationId: OrgId;
};

/**
 * Errors that can occur during organization creation
 */
export type CreateOrganizationError = OrganizationError | EventError | AuthorizationError;

/**
 * Create a new organization
 *
 * Business rules:
 * - Only committee admins can create organizations
 * - Organization belongs to a specific event
 * - Description is optional and limited to 100 characters
 * - Logo is optional
 *
 * @param deps - Dependencies (organizationRepo, authService)
 * @param input - Organization creation input
 * @returns Result with organization ID or error
 */
export async function createOrganization(
  deps: Pick<
    Dependencies,
    "organizationRepo" | "authService" | "eventDomainService" | "db" | "storageService"
  >,
  input: CreateOrganizationInput,
): Result.ResultAsync<CreateOrganizationOutput, CreateOrganizationError> {
  return gen(async function* ($) {
    // Generate new organization ID
    const organizationId = generateId<OrgId>();

    // Authorization check: only committee admins can create organizations
    const resource = organizationResource(organizationId, input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:create"));

    // Fetch event and check if modifiable
    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    // Create organization entity
    const organization = yield* $(
      createOrganizationEntity({
        id: organizationId,
        eventId: input.eventId,
        name: input.name,
        description: input.description,
        logoImageId: input.logoImageId,
      }),
    );

    // Save organization to database
    await deps.organizationRepo.saveOrganization(organization);

    // Migrate pending image scope to organization scope
    if (input.logoImageId) {
      await migrateImageScope(deps, input.logoImageId, {
        type: "organization",
        eventId: input.eventId,
        orgId: organizationId,
      });
    }

    return { organizationId: organization.id, eventId: organization.eventId };
  });
}
