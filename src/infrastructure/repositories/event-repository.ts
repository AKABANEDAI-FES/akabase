import { db } from "@/db";
import { deadlines, events, places, tags } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { deadlineSchema, eventSchema, placeSchema, tagSchema } from "@/domain/event/schema";
import type { Deadline, Event, Place, Tag } from "@/domain/event/schema";
import type { DeadlineId, EventId, PlaceId, TagId } from "@/domain/shared/ids";
import type { EventRepository } from "@/domain/event/repository";
import { RepositoryException } from "@/domain/shared/repository";

/**
 * Event Repository Implementation using Drizzle ORM
 */
export class EventRepositoryImpl implements EventRepository {
  async findById(id: EventId): Promise<Event | null> {
    try {
      const row = await db.query.events.findFirst({
        where: (events, { eq }) => eq(events.id, id),
      });

      if (!row) {
        return null;
      }

      const event = eventSchema.parse({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return event;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find event", error);
    }
  }

  async findBySlug(slug: string): Promise<Event | null> {
    try {
      const row = await db.query.events.findFirst({
        where: (events, { eq }) => eq(events.slug, slug),
      });

      if (!row) {
        return null;
      }

      const event = eventSchema.parse({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return event;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find event by slug", error);
    }
  }

  async listAll(): Promise<Event[]> {
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

      return eventList;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to list events", error);
    }
  }

  async saveEvent(event: Event): Promise<void> {
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
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save event", error);
    }
  }

  // =============================================================================
  // Tag operations
  // =============================================================================

  async findTags(eventId: EventId): Promise<Tag[]> {
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

      return tagList;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find tags", error);
    }
  }

  async saveTag(tag: Tag): Promise<void> {
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
          where: eq(tags.eventId, tag.eventId),
        });
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save tag", error);
    }
  }

  async deleteTag(eventId: EventId, tagId: TagId): Promise<void> {
    try {
      await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.eventId, eventId)));
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to delete tag", error);
    }
  }

  // =============================================================================
  // Place operations
  // =============================================================================

  async findPlaces(eventId: EventId): Promise<Place[]> {
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

      return placeList;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find places", error);
    }
  }

  async savePlace(place: Place): Promise<void> {
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
          where: eq(places.eventId, place.eventId),
        });
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save place", error);
    }
  }

  async deletePlace(eventId: EventId, placeId: PlaceId): Promise<void> {
    try {
      await db.delete(places).where(and(eq(places.id, placeId), eq(places.eventId, eventId)));
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to delete place", error);
    }
  }

  // =============================================================================
  // Deadline operations
  // =============================================================================

  async findDeadlines(eventId: EventId): Promise<Deadline[]> {
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

      return deadlineList;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find deadlines", error);
    }
  }

  async saveDeadline(deadline: Deadline): Promise<void> {
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
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save deadline", error);
    }
  }

  async deleteDeadline(eventId: EventId, deadlineId: DeadlineId): Promise<void> {
    try {
      await db
        .delete(deadlines)
        .where(and(eq(deadlines.id, deadlineId), eq(deadlines.eventId, eventId)));
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to delete deadline", error);
    }
  }
}
