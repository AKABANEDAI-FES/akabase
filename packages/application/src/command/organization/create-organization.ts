/**
 * Create organization command
 * Creates a new organization for an event
 */

import { Result } from "@archive/result";
import { generateId } from "@archive/domain/shared/ids";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { ImageId, ImageRepository } from "@archive/domain/shared/image";
import type { OrganizationError } from "@archive/domain/organization/errors";
import type { EventError } from "@archive/domain/event/errors";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import type { Actor } from "@archive/domain/authorization/schema";
import { organizationResource } from "@archive/domain/authorization/logic";
import { createOrganizationEntity } from "@archive/domain/organization/logic";
import type { OrganizationRepository } from "@archive/domain/organization/repository";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import type { EventDomainService } from "@archive/domain/event/service";
import { migrateImageScope } from "../shared/migrate-image-scope";

export type CreateOrganizationInput = {
  eventId: EventId;
  name: string;
  description: string | null;
  logoImageId: ImageId | null;
  actor: Actor;
};

export type CreateOrganizationOutput = {
  eventId: EventId;
  organizationId: OrgId;
};

export type CreateOrganizationError = OrganizationError | EventError | AuthorizationError;

export async function createOrganization(
  deps: {
    organizationRepo: OrganizationRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
    imageRepo: ImageRepository;
  },
  input: CreateOrganizationInput,
): Result.ResultAsync<CreateOrganizationOutput, CreateOrganizationError> {
  return Result.gen(async function* ($) {
    const organizationId = generateId<OrgId>();

    const resource = organizationResource(organizationId, input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "organization:create"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const organization = yield* $(
      createOrganizationEntity({
        id: organizationId,
        eventId: input.eventId,
        name: input.name,
        description: input.description,
        logoImageId: input.logoImageId,
      }),
    );

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
