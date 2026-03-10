import { Result } from "@archive/result";
import type { EventDomainService } from "@archive/domain/event/service";
import type { EventRepository } from "@archive/domain/event/repository";
import type { EventId, PlaceId, TagId } from "@archive/domain/event/schema";
import { EVENT_ERROR_CODE, eventError } from "@archive/domain/event/errors";
import { canModifyEvent } from "@archive/domain/event/logic";

export class EventDomainServiceImpl implements EventDomainService {
  private readonly eventRepo: EventRepository;

  constructor(eventRepo: EventRepository) {
    this.eventRepo = eventRepo;
  }

  async ensureSlugUnique(slug: string, excludeEventId?: EventId) {
    const event = await this.eventRepo.findBySlug(slug);

    if (event !== null && event.id !== excludeEventId) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "このスラッグは既に使用されています"),
      );
    }

    return Result.succeed(true);
  }

  async ensureTagNameUnique(eventId: EventId, name: string, excludeTagId?: TagId) {
    const tags = await this.eventRepo.findTags(eventId);

    const duplicate = tags.find((tag) => tag.name === name && tag.id !== excludeTagId);

    if (duplicate) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.TAG_NOT_UNIQUE, "このタグ名は既に使用されています"),
      );
    }

    return Result.succeed(true);
  }

  async ensurePlaceNameUnique(
    eventId: EventId,
    name: string,
    parentId: PlaceId | null,
    excludePlaceId?: PlaceId,
  ) {
    const places = await this.eventRepo.findPlaces(eventId);

    const duplicate = places.find(
      (place) => place.name === name && place.parentId === parentId && place.id !== excludePlaceId,
    );

    if (duplicate) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.PLACE_NOT_UNIQUE, "同じ階層にこの場所名は既に使用されています"),
      );
    }

    return Result.succeed(true);
  }

  async resolveModifiableEvent(eventId: EventId) {
    const { eventRepo } = this;
    return Result.gen(async function* ($) {
      const event = await eventRepo.findById(eventId);
      if (!event) {
        return yield* $(
          Result.fail(eventError(EVENT_ERROR_CODE.EVENT_NOT_FOUND, "イベントが見つかりません")),
        );
      }
      yield* $(canModifyEvent(event));
      return event;
    });
  }
}
