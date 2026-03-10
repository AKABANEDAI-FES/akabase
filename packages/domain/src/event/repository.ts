import type { Deadline, DeadlineId, Event, EventId, Place, PlaceId, Tag, TagId } from "./schema";

/**
 * =============================================================================
 * Event Repository
 * =============================================================================
 * Repository methods throw RepositoryException on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

export type EventRepository = {
  /**
   * Find event by ID
   * @throws {RepositoryException} on database errors
   */
  findById(id: EventId): Promise<Event | null>;

  /**
   * Find event by slug
   * @throws {RepositoryException} on database errors
   */
  findBySlug(slug: string): Promise<Event | null>;

  /**
   * List all events
   * @throws {RepositoryException} on database errors
   */
  listAll(): Promise<Event[]>;

  /**
   * Find all tags for an event
   * @throws {RepositoryException} on database errors
   */
  findTags(eventId: EventId): Promise<Tag[]>;

  /**
   * Find all places for an event
   * @throws {RepositoryException} on database errors
   */
  findPlaces(eventId: EventId): Promise<Place[]>;

  /**
   * Find all deadlines for an event
   * @throws {RepositoryException} on database errors
   */
  findDeadlines(eventId: EventId): Promise<Deadline[]>;

  /**
   * Save event (insert or update)
   * @throws {RepositoryException} on database errors
   */
  saveEvent(event: Event): Promise<void>;

  /**
   * Save tag (insert or update)
   * @throws {RepositoryException} on database errors
   */
  saveTag(tag: Tag): Promise<void>;

  /**
   * Batch update tag display orders atomically
   * @throws {RepositoryException} on database errors
   */
  updateTagDisplayOrders(
    eventId: EventId,
    tagOrders: { tagId: TagId; displayOrder: number }[],
  ): Promise<void>;

  /**
   * Delete tag (scoped by eventId)
   * @throws {RepositoryException} on database errors
   */
  deleteTag(eventId: EventId, tagId: TagId): Promise<void>;

  /**
   * Get the maximum displayOrder value for tags in an event
   * Returns -1 if no tags exist
   * @throws {RepositoryException} on database errors
   */
  getMaxTagDisplayOrder(eventId: EventId): Promise<number>;

  /**
   * Save place (insert or update)
   * @throws {RepositoryException} on database errors
   */
  savePlace(place: Place): Promise<void>;

  /**
   * Delete place (scoped by eventId)
   * @throws {RepositoryException} on database errors
   */
  deletePlace(eventId: EventId, placeId: PlaceId): Promise<void>;

  /**
   * Save or update deadline
   * @throws {RepositoryException} on database errors
   */
  saveDeadline(deadline: Deadline): Promise<void>;

  /**
   * Delete deadline (scoped by eventId)
   * @throws {RepositoryException} on database errors
   */
  deleteDeadline(eventId: EventId, deadlineId: DeadlineId): Promise<void>;
};
