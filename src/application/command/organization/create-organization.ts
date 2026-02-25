import type { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { OrganizationError } from "@/domain/organization/errors";
import type { EventError } from "@/domain/event/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Actor } from "@/domain/authorization/schema";
import { organizationResource } from "@/domain/authorization/logic";
import { organizationSchema } from "@/domain/organization/schema";
import type { Dependencies } from "@/infrastructure/di";

/**
 * Input for creating a new organization
 */
export type CreateOrganizationInput = {
  eventId: EventId;
  name: string;
  description: string | null;
  logoKey: string | null;
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
export type CreateOrganizationError =
  | OrganizationError
  | EventError
  | RepositoryError
  | AuthorizationError;

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
  deps: Pick<Dependencies, "organizationRepo" | "authService" | "eventDomainService">,
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
    const organization = organizationSchema.parse({
      id: organizationId,
      eventId: input.eventId,
      name: input.name,
      description: input.description,
      logoKey: input.logoKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save organization to database
    yield* $(await deps.organizationRepo.saveOrganization(organization));

    return { organizationId: organization.id, eventId: organization.eventId };
  });
}
