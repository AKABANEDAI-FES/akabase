import { Result } from "@praha/byethrow";
import type { Deadline, Event, Place, Tag } from "./schema";
import type { EventError } from "./errors";
import { eventError } from "./errors";
import type { PlaceId, TagId } from "../shared/ids";

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
    return Result.fail(eventError("EVENT_ARCHIVED", "アーカイブされたイベントは変更できません。"));
  }
  return Result.succeed(true);
}

/**
 * Check if tag slug is unique within the event
 * Rule: Each tag must have a unique slug per event
 */
export function isTagSlugUnique(
  tags: Tag[],
  slug: string,
  excludeTagId?: TagId,
): Result.Result<true, EventError> {
  const existingTag = tags.find((t) => t.slug === slug && t.id !== excludeTagId);

  if (existingTag) {
    return Result.fail(
      eventError("TAG_SLUG_NOT_UNIQUE", `タグスラッグ「${slug}」は既に使用されています。`),
    );
  }

  return Result.succeed(true);
}

/**
 * Check if place name is unique within the event
 * Rule: Each place must have a unique name per event
 */
export function isPlaceUnique(
  places: Place[],
  name: string,
  excludePlaceId?: PlaceId,
): Result.Result<true, EventError> {
  const existingPlace = places.find((p) => p.name === name && p.id !== excludePlaceId);

  if (existingPlace) {
    return Result.fail(eventError("PLACE_NOT_UNIQUE", `場所「${name}」は既に登録されています。`));
  }

  return Result.succeed(true);
}

/**
 * Check if a field is editable based on deadline
 * Rule: After deadline, only admins can edit
 */
export function isFieldEditable(
  deadlines: Deadline[],
  fieldKey: string,
  currentTime: Date,
  isAdmin: boolean,
): Result.Result<true, EventError> {
  const deadline = deadlines.find((d) => d.fieldKey === fieldKey);

  // No deadline means always editable
  if (!deadline) {
    return Result.succeed(true);
  }

  // Check if past deadline
  const isPastDeadline = currentTime > deadline.deadlineAt;

  // Admins can always edit
  if (isAdmin) {
    return Result.succeed(true);
  }

  // Non-admins cannot edit past deadline
  if (isPastDeadline) {
    return Result.fail(
      eventError(
        "FIELD_PAST_DEADLINE",
        `「${fieldKey}」の締切（${deadline.deadlineAt.toLocaleString("ja-JP")}）を過ぎているため編集できません。`,
      ),
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
 * Add a new tag to the list
 * Returns new tags array
 */
export function addTag(tags: Tag[], newTag: Tag): Tag[] {
  return [...tags, newTag];
}

/**
 * Remove a tag from the list
 * Returns new tags array
 */
export function removeTag(tags: Tag[], tagId: TagId): Tag[] {
  return tags.filter((t) => t.id !== tagId);
}

/**
 * Update a tag
 * Returns new tags array
 */
export function updateTag(tags: Tag[], updatedTag: Tag): Tag[] {
  return tags.map((t) => (t.id === updatedTag.id ? updatedTag : t));
}

/**
 * =============================================================================
 * Place Management Functions (Pure Functions)
 * =============================================================================
 */

/**
 * Add a new place to the list
 * Returns new places array
 */
export function addPlace(places: Place[], newPlace: Place): Place[] {
  return [...places, newPlace];
}

/**
 * Remove a place from the list
 * Returns new places array
 */
export function removePlace(places: Place[], placeId: PlaceId): Place[] {
  return places.filter((p) => p.id !== placeId);
}

/**
 * Update a place
 * Returns new places array
 */
export function updatePlace(places: Place[], updatedPlace: Place): Place[] {
  return places.map((p) => (p.id === updatedPlace.id ? updatedPlace : p));
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
export function archiveEvent(event: Event): Event {
  return {
    ...event,
    status: "archived",
    updatedAt: new Date(),
  };
}

/**
 * Activate an event
 * Changes status to "active"
 */
export function activateEvent(event: Event): Event {
  return {
    ...event,
    status: "active",
    updatedAt: new Date(),
  };
}
