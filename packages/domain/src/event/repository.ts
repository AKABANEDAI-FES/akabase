import type {
  Deadline,
  DeadlineId,
  Event,
  EventId,
  EventSettings,
  Place,
  PlaceId,
  ProjectCategory,
  ProjectCategoryId,
  Tag,
  TagId,
} from "./schema";

/**
 * =============================================================================
 * Event Repository
 * =============================================================================
 * Repository methods throw RepositoryExceptionError on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

export type EventRepository = {
  /**
   * Find event by ID
   * @throws {RepositoryExceptionError} on database errors
   */
  findById(id: EventId): Promise<Event | null>;

  /**
   * Find event by slug
   * @throws {RepositoryExceptionError} on database errors
   */
  findBySlug(slug: string): Promise<Event | null>;

  /**
   * List all events
   * @throws {RepositoryExceptionError} on database errors
   */
  listAll(): Promise<Event[]>;

  /**
   * Find all tags for an event
   * @throws {RepositoryExceptionError} on database errors
   */
  findTags(eventId: EventId): Promise<Tag[]>;

  /**
   * Find all places for an event
   * @throws {RepositoryExceptionError} on database errors
   */
  findPlaces(eventId: EventId): Promise<Place[]>;

  /**
   * Find all deadlines for an event
   * @throws {RepositoryExceptionError} on database errors
   */
  findDeadlines(eventId: EventId): Promise<Deadline[]>;

  /**
   * Find all project categories for an event
   * @throws {RepositoryExceptionError} on database errors
   */
  findProjectCategories(eventId: EventId): Promise<ProjectCategory[]>;

  /**
   * Save event (insert or update)
   * @throws {RepositoryExceptionError} on database errors
   */
  saveEvent(event: Event): Promise<void>;

  /**
   * Save tag (insert or update)
   * @throws {RepositoryExceptionError} on database errors
   */
  saveTag(tag: Tag): Promise<void>;

  /**
   * Batch update tag display orders atomically
   * @throws {RepositoryExceptionError} on database errors
   */
  updateTagDisplayOrders(
    eventId: EventId,
    tagOrders: { tagId: TagId; displayOrder: number }[],
  ): Promise<void>;

  /**
   * Delete tag (scoped by eventId)
   * @throws {RepositoryExceptionError} on database errors
   */
  deleteTag(eventId: EventId, tagId: TagId): Promise<void>;

  /**
   * Get the maximum displayOrder value for tags in an event
   * Returns -1 if no tags exist
   * @throws {RepositoryExceptionError} on database errors
   */
  getMaxTagDisplayOrder(eventId: EventId): Promise<number>;

  /**
   * Save project category (insert or update)
   * @throws {RepositoryExceptionError} on database errors
   */
  saveProjectCategory(category: ProjectCategory): Promise<void>;

  /**
   * Batch update project category display orders atomically
   * @throws {RepositoryExceptionError} on database errors
   */
  updateProjectCategoryDisplayOrders(
    eventId: EventId,
    categoryOrders: { categoryId: ProjectCategoryId; displayOrder: number }[],
  ): Promise<void>;

  /**
   * Delete project category (scoped by eventId)
   * Projects referencing the category fall back to uncategorized
   * @throws {RepositoryExceptionError} on database errors
   */
  deleteProjectCategory(eventId: EventId, categoryId: ProjectCategoryId): Promise<void>;

  /**
   * Get the maximum displayOrder value for project categories in an event
   * Returns -1 if no project categories exist
   * @throws {RepositoryExceptionError} on database errors
   */
  getMaxProjectCategoryDisplayOrder(eventId: EventId): Promise<number>;

  /**
   * Save place (insert or update)
   * @throws {RepositoryExceptionError} on database errors
   */
  savePlace(place: Place): Promise<void>;

  /**
   * Delete place (scoped by eventId)
   * @throws {RepositoryExceptionError} on database errors
   */
  deletePlace(eventId: EventId, placeId: PlaceId): Promise<void>;

  /**
   * Save or update deadline
   * @throws {RepositoryExceptionError} on database errors
   */
  saveDeadline(deadline: Deadline): Promise<void>;

  /**
   * Delete deadline (scoped by eventId)
   * @throws {RepositoryExceptionError} on database errors
   */
  deleteDeadline(eventId: EventId, deadlineId: DeadlineId): Promise<void>;

  /**
   * Find event settings for an event
   * Returns null if not configured yet
   * @throws {RepositoryExceptionError} on database errors
   */
  findEventSettings(eventId: EventId): Promise<EventSettings | null>;

  /**
   * Save event settings (insert or update)
   * @throws {RepositoryExceptionError} on database errors
   */
  saveEventSettings(settings: EventSettings): Promise<void>;
};
