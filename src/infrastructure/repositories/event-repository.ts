import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { deadlines, events, places, tags } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { deadlineSchema, eventSchema, placeSchema, tagSchema } from "@/domain/event/schema";
import type { Deadline, Event, Place, Tag } from "@/domain/event/schema";
import type { DeadlineId, EventId, PlaceId, TagId } from "@/domain/shared/ids";
import type { EventRepository } from "@/domain/event/repository";
import type { RepositoryError } from "@/domain/shared/repository";
import { repositoryError } from "@/domain/shared/repository";

/**
 * Event Repository Implementation using Drizzle ORM
 */
export class EventRepositoryImpl implements EventRepository {
  async findById(id: EventId): Promise<Result.Result<Event | null, RepositoryError>> {
    try {
      const row = await db.query.events.findFirst({
        where: (events, { eq }) => eq(events.id, id),
      });

      if (!row) {
        return Result.succeed(null);
      }

      const event = eventSchema.parse({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return Result.succeed(event);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find event", error));
    }
  }

  async findBySlug(slug: string): Promise<Result.Result<Event | null, RepositoryError>> {
    try {
      const row = await db.query.events.findFirst({
        where: (events, { eq }) => eq(events.slug, slug),
      });

      if (!row) {
        return Result.succeed(null);
      }

      const event = eventSchema.parse({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return Result.succeed(event);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find event by slug", error));
    }
  }

  async listAll(): Promise<Result.Result<Event[], RepositoryError>> {
    try {
      const rows = await db.query.events.findMany({
        orderBy: [desc(events.createdAt)],
      });

      const eventList: Event[] = rows.map((row) =>
        eventSchema.parse({
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        }),
      );

      return Result.succeed(eventList);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to list events", error));
    }
  }

  async saveEvent(event: Event): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .insert(events)
        .values({
          id: event.id,
          name: event.name,
          slug: event.slug,
          status: event.status,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        })
        .onConflictDoUpdate({
          target: events.id,
          set: {
            // Immutable fields excluded: id, createdAt
            name: event.name,
            slug: event.slug,
            status: event.status,
            updatedAt: event.updatedAt,
          },
        });

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save event", error));
    }
  }

  // =============================================================================
  // Tag operations
  // =============================================================================

  async findTags(eventId: EventId): Promise<Result.Result<Tag[], RepositoryError>> {
    try {
      const rows = await db.query.tags.findMany({
        where: (tags, { eq }) => eq(tags.eventId, eventId),
      });

      const tagList: Tag[] = rows.map((row) =>
        tagSchema.parse({
          id: row.id,
          eventId: row.eventId,
          name: row.name,
          createdAt: new Date(row.createdAt),
        }),
      );

      return Result.succeed(tagList);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find tags", error));
    }
  }

  async saveTag(tag: Tag): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .insert(tags)
        .values({
          id: tag.id,
          eventId: tag.eventId,
          name: tag.name,
          createdAt: tag.createdAt,
        })
        .onConflictDoUpdate({
          target: tags.id,
          set: {
            // Immutable fields excluded: id, eventId, createdAt
            name: tag.name,
          },
        });

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save tag", error));
    }
  }

  async deleteTag(tagId: TagId): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db.delete(tags).where(eq(tags.id, tagId));
      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to delete tag", error));
    }
  }

  // =============================================================================
  // Place operations
  // =============================================================================

  async findPlaces(eventId: EventId): Promise<Result.Result<Place[], RepositoryError>> {
    try {
      const rows = await db.query.places.findMany({
        where: (places, { eq }) => eq(places.eventId, eventId),
      });

      const placeList: Place[] = rows.map((row) =>
        placeSchema.parse({
          id: row.id,
          eventId: row.eventId,
          name: row.name,
          parentId: row.parentId,
          createdAt: new Date(row.createdAt),
        }),
      );

      return Result.succeed(placeList);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find places", error));
    }
  }

  async savePlace(place: Place): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .insert(places)
        .values({
          id: place.id,
          eventId: place.eventId,
          name: place.name,
          parentId: place.parentId,
          createdAt: place.createdAt,
        })
        .onConflictDoUpdate({
          target: places.id,
          set: {
            // Immutable fields excluded: id, eventId, parentId, createdAt
            // Note: parentId cannot be changed after creation to avoid circular reference complexity
            name: place.name,
          },
        });

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save place", error));
    }
  }

  async deletePlace(placeId: PlaceId): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db.delete(places).where(eq(places.id, placeId));
      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to delete place", error));
    }
  }

  // =============================================================================
  // Deadline operations
  // =============================================================================

  async findDeadlines(eventId: EventId): Promise<Result.Result<Deadline[], RepositoryError>> {
    try {
      const rows = await db.query.deadlines.findMany({
        where: (deadlines, { eq }) => eq(deadlines.eventId, eventId),
      });

      const deadlineList: Deadline[] = rows.map((row) =>
        deadlineSchema.parse({
          id: row.id,
          eventId: row.eventId,
          fieldKey: row.fieldKey,
          deadlineAt: new Date(row.deadlineAt),
          createdAt: new Date(row.createdAt),
        }),
      );

      return Result.succeed(deadlineList);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find deadlines", error));
    }
  }

  async saveDeadline(deadline: Deadline): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .insert(deadlines)
        .values({
          id: deadline.id,
          eventId: deadline.eventId,
          fieldKey: deadline.fieldKey,
          deadlineAt: deadline.deadlineAt,
          createdAt: deadline.createdAt,
        })
        .onConflictDoUpdate({
          target: [deadlines.eventId, deadlines.fieldKey],
          set: {
            deadlineAt: deadline.deadlineAt,
          },
        });

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save deadline", error));
    }
  }

  async deleteDeadline(deadlineId: DeadlineId): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db.delete(deadlines).where(eq(deadlines.id, deadlineId));
      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to delete deadline", error));
    }
  }
}
