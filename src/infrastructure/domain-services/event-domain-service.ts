import { Result } from "@praha/byethrow";
import type { EventDomainService } from "@/domain/event/service";
import type { EventRepository } from "@/domain/event/repository";
import type { EventId, PlaceId, TagId } from "@/domain/shared/ids";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";

export class EventDomainServiceImpl implements EventDomainService {
  constructor(private readonly eventRepo: EventRepository) {}

  async ensureSlugUnique(slug: string, excludeEventId?: EventId) {
    const result = await this.eventRepo.findBySlug(slug);
    if (Result.isFailure(result)) {
      return result;
    }

    if (result.value !== null && result.value.id !== excludeEventId) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "このスラッグは既に使用されています"),
      );
    }

    return Result.succeed(true);
  }

  async ensureTagNameUnique(eventId: EventId, name: string, excludeTagId?: TagId) {
    const result = await this.eventRepo.findTags(eventId);
    if (Result.isFailure(result)) {
      return result;
    }

    const duplicate = result.value.find((tag) => tag.name === name && tag.id !== excludeTagId);

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
    const result = await this.eventRepo.findPlaces(eventId);
    if (Result.isFailure(result)) {
      return result;
    }

    const duplicate = result.value.find(
      (place) => place.name === name && place.parentId === parentId && place.id !== excludePlaceId,
    );

    if (duplicate) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.PLACE_NOT_UNIQUE, "同じ階層にこの場所名は既に使用されています"),
      );
    }

    return Result.succeed(true);
  }
}
