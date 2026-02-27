import { Result } from "@praha/byethrow";
import type { Deadline, DeadlineFieldKey, Event, Place, Tag } from "./schema";
import { deadlineSchema, eventSchema, placeSchema, tagSchema } from "./schema";
import type { EventError } from "./errors";
import { EVENT_ERROR_CODE, eventError } from "./errors";
import type { DeadlineId, EventId, PlaceId, TagId } from "../shared/ids";
import { DOMAIN_ERROR_CODE } from "../shared/errors";

/**
 * Create a new event entity
 */
export function createEventEntity(input: {
  id: EventId;
  name: string;
  slug: string;
  now?: Date;
}): Result.Result<Event, EventError> {
  const now = input.now ?? new Date();

  const data = {
    id: input.id,
    name: input.name,
    slug: input.slug,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  return Result.try({
    try: () => eventSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "イベントの作成に失敗しました"),
  });
}

/**
 * Update event basic fields
 */
export function updateEventEntity(
  event: Event,
  input: {
    name: string;
    slug: string;
    now?: Date;
  },
): Result.Result<Event, EventError> {
  const data = {
    ...event,
    name: input.name,
    slug: input.slug,
    updatedAt: input.now ?? new Date(),
  };

  return Result.try({
    try: () => eventSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "イベントの更新に失敗しました"),
  });
}

/**
 * =============================================================================
 * Invariant Checks (Business Rules)
 * =============================================================================
 */

/**
 * Check if event can be modified
 * Rule: Archived events are read-only
 */
export function canModifyEvent(event: Event): Result.Result<true, EventError> {
  if (event.status === "archived") {
    return Result.fail(
      eventError(EVENT_ERROR_CODE.EVENT_ARCHIVED, "アーカイブされたイベントは変更できません。"),
    );
  }
  return Result.succeed(true);
}

/**
 * =============================================================================
 * Tag Management Functions (Pure Functions)
 * =============================================================================
 */

/**
 * Create a new tag entity
 */
export function createTagEntity(input: {
  id: TagId;
  eventId: EventId;
  name: string;
  now?: Date;
}): Result.Result<Tag, EventError> {
  const data = {
    id: input.id,
    eventId: input.eventId,
    name: input.name,
    createdAt: input.now ?? new Date(),
  };

  return Result.try({
    try: () => tagSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "タグの作成に失敗しました"),
  });
}

/**
 * Update tag entity
 * Returns new tag with updated fields (only mutable fields)
 * Validates the updated tag against schema
 */
export function updateTagEntity(
  tag: Tag,
  input: {
    name: string;
  },
): Result.Result<Tag, EventError> {
  const data = {
    ...tag,
    name: input.name,
  };

  return Result.try({
    try: () => tagSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "タグの更新に失敗しました"),
  });
}

/**
 * =============================================================================
 * Event Updates
 * =============================================================================
 */

/**
 * Archive an event
 * Changes status to "archived"
 */
export function archiveEvent(event: Event, now?: Date): Result.Result<Event, EventError> {
  const data = {
    ...event,
    status: "archived",
    updatedAt: now ?? new Date(),
  };

  return Result.try({
    try: () => eventSchema.parse(data),
    catch: () =>
      eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "イベントのアーカイブに失敗しました"),
  });
}

/**
 * Activate an event
 * Changes status to "active"
 */
export function activateEvent(event: Event, now?: Date): Result.Result<Event, EventError> {
  const data = {
    ...event,
    status: "active",
    updatedAt: now ?? new Date(),
  };

  return Result.try({
    try: () => eventSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "イベントの有効化に失敗しました"),
  });
}

/**
 * =============================================================================
 * Place Management Functions (Pure Functions)
 * =============================================================================
 */

/**
 * Create a new place entity
 */
export function createPlaceEntity(input: {
  id: PlaceId;
  eventId: EventId;
  name: string;
  parentId: PlaceId | null;
  now?: Date;
}): Result.Result<Place, EventError> {
  const data = {
    id: input.id,
    eventId: input.eventId,
    name: input.name,
    parentId: input.parentId,
    createdAt: input.now ?? new Date(),
  };

  return Result.try({
    try: () => placeSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "場所の作成に失敗しました"),
  });
}

/**
 * Update place entity
 * Only name can be updated (parentId is immutable)
 */
export function updatePlaceEntity(
  place: Place,
  input: {
    name: string;
  },
): Result.Result<Place, EventError> {
  const data = {
    ...place,
    name: input.name,
  };

  return Result.try({
    try: () => placeSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "場所の更新に失敗しました"),
  });
}

/**
 * =============================================================================
 * Deadline Management Functions (Pure Functions)
 * =============================================================================
 */

/**
 * Create a new deadline entity
 */
export function createDeadlineEntity(input: {
  id: DeadlineId;
  eventId: EventId;
  fieldKey: DeadlineFieldKey;
  startAt?: Date;
  deadlineAt: Date;
  now?: Date;
}): Result.Result<Deadline, EventError> {
  const data = {
    id: input.id,
    eventId: input.eventId,
    fieldKey: input.fieldKey,
    startAt: input.startAt,
    deadlineAt: input.deadlineAt,
    createdAt: input.now ?? new Date(),
  };

  return Result.try({
    try: () => deadlineSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "締切の作成に失敗しました"),
  });
}

/**
 * Update deadline entity
 * Both startAt and deadlineAt can be updated (fieldKey is immutable)
 */
export function updateDeadlineEntity(
  deadline: Deadline,
  input: {
    startAt?: Date;
    deadlineAt: Date;
  },
): Result.Result<Deadline, EventError> {
  const data = {
    ...deadline,
    startAt: input.startAt,
    deadlineAt: input.deadlineAt,
  };

  return Result.try({
    try: () => deadlineSchema.parse(data),
    catch: () => eventError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "締切の更新に失敗しました"),
  });
}
