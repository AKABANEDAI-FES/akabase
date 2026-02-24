import { Result } from "@praha/byethrow";
import type { Deadline, Event, Place, Tag } from "./schema";
import { tagSchema } from "./schema";
import type { EventError } from "./errors";
import { EVENT_ERROR_CODE, eventError } from "./errors";
import type { EventId, PlaceId } from "../shared/ids";

/**
 * Create a new event entity
 */
export function createEventEntity(input: {
  id: EventId;
  name: string;
  slug: string;
  now?: Date;
}): Event {
  const now = input.now ?? new Date();

  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
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
): Event {
  return {
    ...event,
    name: input.name,
    slug: input.slug,
    updatedAt: input.now ?? new Date(),
  };
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
 * Get all child places of a parent
 */
export function getChildPlaces(places: Place[], parentId: PlaceId | null): Place[] {
  return places.filter((p) => p.parentId === parentId);
}

/**
 * Get all descendant places (recursive)
 * Returns all children, grandchildren, etc.
 */
export function getAllDescendantPlaces(places: Place[], parentId: PlaceId): Place[] {
  const children = places.filter((p) => p.parentId === parentId);
  const descendants = [...children];

  for (const child of children) {
    descendants.push(...getAllDescendantPlaces(places, child.id));
  }

  return descendants;
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
        EVENT_ERROR_CODE.FIELD_PAST_DEADLINE,
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
 * Update tag entity
 * Returns new tag with updated fields (only mutable fields)
 * Validates the updated tag against schema
 */
export function updateTag(
  tag: Tag,
  input: {
    name: string;
  },
): Result.Result<Tag, EventError> {
  const updated = {
    ...tag,
    name: input.name,
  };

  // Validate against schema to ensure updated tag is valid
  const parseResult = tagSchema.safeParse(updated);
  if (!parseResult.success) {
    return Result.fail(
      eventError(
        EVENT_ERROR_CODE.TAG_INVALID,
        parseResult.error.issues[0]?.message || "タグの検証に失敗しました",
      ),
    );
  }

  return Result.succeed(parseResult.data);
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
