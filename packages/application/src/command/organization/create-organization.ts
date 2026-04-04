/**
 * Create organization command
 * Creates a new organization for an event
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ImageId, ImageRepository } from "@akabase/domain/shared/image";
import type { OrganizationError } from "@akabase/domain/organization/errors";
import type { EventError } from "@akabase/domain/event/errors";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { organizationResource } from "@akabase/domain/authorization/logic";
import { createOrganizationEntity } from "@akabase/domain/organization/logic";
import type { OrganizationRepository } from "@akabase/domain/organization/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";
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
