/**
 * Create deadline command
 * Creates a new deadline for a field
 */

import { Result } from "@akabase/result";
import { generateId } from "@akabase/domain/shared/ids";
import type { DeadlineFieldKey, DeadlineId, EventId } from "@akabase/domain/event/schema";
import type { EventError } from "@akabase/domain/event/errors";
import { EVENT_ERROR_CODE, eventError } from "@akabase/domain/event/errors";
import { createDeadlineEntity } from "@akabase/domain/event/logic";
import type { AuthorizationError } from "@akabase/domain/authorization/errors";
import type { Actor } from "@akabase/domain/authorization/schema";
import { eventResource } from "@akabase/domain/authorization/logic";
import type { EventRepository } from "@akabase/domain/event/repository";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import type { EventDomainService } from "@akabase/domain/event/service";

export type CreateDeadlineInput = {
  eventId: EventId;
  fieldKey: DeadlineFieldKey;
  startAt?: Date;
  deadlineAt: Date;
  actor: Actor;
};

export type CreateDeadlineOutput = {
  deadlineId: DeadlineId;
  eventId: EventId;
};

export type CreateDeadlineError = EventError | AuthorizationError;

export async function createDeadline(
  deps: {
    eventRepo: EventRepository;
    authService: AuthorizationService;
    eventDomainService: EventDomainService;
  },
  input: CreateDeadlineInput,
): Result.ResultAsync<CreateDeadlineOutput, CreateDeadlineError> {
  return Result.gen(async function* ($) {
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:update"));

    yield* $(await deps.eventDomainService.resolveModifiableEvent(input.eventId));

    const existingDeadlines = await deps.eventRepo.findDeadlines(input.eventId);
    const existingDeadline = existingDeadlines.find((d) => d.fieldKey === input.fieldKey);

    if (existingDeadline) {
      return yield* $(
        Result.fail(
          eventError(
            EVENT_ERROR_CODE.DEADLINE_ALREADY_EXISTS,
            `フィールド「${input.fieldKey}」の締切は既に設定されています。更新する場合は編集してください。`,
          ),
        ),
      );
    }

    const deadlineId = generateId<DeadlineId>();
    const deadline = yield* $(
      createDeadlineEntity({
        id: deadlineId,
        eventId: input.eventId,
        fieldKey: input.fieldKey,
        startAt: input.startAt,
        deadlineAt: input.deadlineAt,
      }),
    );

    await deps.eventRepo.saveDeadline(deadline);

    return { deadlineId, eventId: input.eventId };
  });
}
