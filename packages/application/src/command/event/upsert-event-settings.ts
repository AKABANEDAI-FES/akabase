/**
 * Upsert event settings command
 * Creates or updates event settings for an event
 */

import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { createEventSettingsEntity, updateEventSettingsEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type UpsertEventSettingsInput = {
  eventId: EventId;
  webContentDescription: string | null;
  pamphletTextMaxLength: number | null;
  actor: Actor;
};

export type UpsertEventSettingsOutput = {
  eventId: EventId;
};

export type UpsertEventSettingsError = EventError | AuthorizationError;

export async function upsertEventSettings(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: UpsertEventSettingsInput,
): Result.ResultAsync<UpsertEventSettingsOutput, UpsertEventSettingsError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingSettings = await deps.eventRepo.findEventSettings(input.eventId);
    const settings = yield* $(
      existingSettings
        ? updateEventSettingsEntity(existingSettings, {
            webContentDescription: input.webContentDescription,
            pamphletTextMaxLength: input.pamphletTextMaxLength,
          })
        : createEventSettingsEntity({
            eventId: input.eventId,
            webContentDescription: input.webContentDescription,
            pamphletTextMaxLength: input.pamphletTextMaxLength,
          }),
    );

    await deps.eventRepo.saveEventSettings(settings);

    return { eventId: input.eventId };
  });
}
