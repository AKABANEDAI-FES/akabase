import type { Result } from "@praha/byethrow";
import type { Deadline, Event, Place, Tag } from "./schema";
import type { DeadlineId, EventId, PlaceId, TagId } from "@/domain/shared/ids";
import type { RepositoryError } from "@/domain/shared/repository";

/**
 * =============================================================================
 * Event Repository
 * =============================================================================
 */

export interface EventRepository {
  /**
   * Find event by ID
   */
  findById(id: EventId): Promise<Result.Result<Event | null, RepositoryError>>;

  /**
   * Find event by slug
   */
  findBySlug(slug: string): Promise<Result.Result<Event | null, RepositoryError>>;

  /**
   * List all events
   */
  listAll(): Promise<Result.Result<Event[], RepositoryError>>;

  /**
   * Find all tags for an event
   */
  findTags(eventId: EventId): Promise<Result.Result<Tag[], RepositoryError>>;

  /**
   * Find all places for an event
   */
  findPlaces(eventId: EventId): Promise<Result.Result<Place[], RepositoryError>>;

  /**
   * Find all deadlines for an event
   */
  findDeadlines(eventId: EventId): Promise<Result.Result<Deadline[], RepositoryError>>;

  /**
   * Save event (insert or update)
   */
  saveEvent(event: Event): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save tag (insert or update)
   */
  saveTag(tag: Tag): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Delete tag (scoped by eventId)
   */
  deleteTag(eventId: EventId, tagId: TagId): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save place (insert or update)
   */
  savePlace(place: Place): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Delete place (scoped by eventId)
   */
  deletePlace(eventId: EventId, placeId: PlaceId): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Save or update deadline
   */
  saveDeadline(deadline: Deadline): Promise<Result.Result<void, RepositoryError>>;

  /**
   * Delete deadline (scoped by eventId)
   */
  deleteDeadline(
    eventId: EventId,
    deadlineId: DeadlineId,
  ): Promise<Result.Result<void, RepositoryError>>;
}
