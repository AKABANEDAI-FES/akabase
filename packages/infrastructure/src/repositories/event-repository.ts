import type { Database } from "../db";
import { schema } from "../db";
import { and, desc, eq, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import {
  deadlineSchema,
  eventSchema,
  eventSettingsSchema,
  placeSchema,
  tagSchema,
} from "@akabase/domain/event/schema";
import type {
  Deadline,
  DeadlineId,
  Event,
  EventId,
  EventSettings,
  Place,
  PlaceId,
  Tag,
  TagId,
} from "@akabase/domain/event/schema";
import type { EventRepository } from "@akabase/domain/event/repository";
import { REPOSITORY_ERROR_CODE, RepositoryExceptionError } from "@akabase/domain/shared/repository";

/**
 * Event Repository Implementation using Drizzle ORM
 */
export class EventRepositoryImpl implements EventRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findById(id: EventId): Promise<Event | null> {
    try {
      const row = await this.db.query.events.findFirst({
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
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find event",
        error,
      );
    }
  }

  async findBySlug(slug: string): Promise<Event | null> {
    try {
      const row = await this.db.query.events.findFirst({
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
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find event by slug",
        error,
      );
    }
  }

  async listAll(): Promise<Event[]> {
    try {
      const rows = await this.db.query.events.findMany({
        orderBy: [desc(schema.events.createdAt)],
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
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to list events",
        error,
      );
    }
  }

  async saveEvent(event: Event): Promise<void> {
    try {
      await this.db
        .insert(schema.events)
        .values({
          id: event.id,
          name: event.name,
          slug: event.slug,
          status: event.status,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        })
        .onConflictDoUpdate({
          target: schema.events.id,
          set: {
            // Immutable fields excluded: id, createdAt
            name: event.name,
            slug: event.slug,
            status: event.status,
            updatedAt: event.updatedAt,
          },
        });
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save event",
        error,
      );
    }
  }

  // =============================================================================
  // Tag operations
  // =============================================================================

  async findTags(eventId: EventId): Promise<Tag[]> {
    try {
      const rows = await this.db.query.tags.findMany({
        where: (tags, { eq }) => eq(tags.eventId, eventId),
      });

      const tagList: Tag[] = rows.map((row) =>
        tagSchema.parse({
          id: row.id,
          eventId: row.eventId,
          name: row.name,
          displayOrder: row.displayOrder,
          createdAt: new Date(row.createdAt),
        }),
      );

      return tagList;
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find tags",
        error,
      );
    }
  }

  async saveTag(tag: Tag): Promise<void> {
    try {
      await this.db
        .insert(schema.tags)
        .values({
          id: tag.id,
          eventId: tag.eventId,
          name: tag.name,
          displayOrder: tag.displayOrder,
          createdAt: tag.createdAt,
        })
        .onConflictDoUpdate({
          target: schema.tags.id,
          set: {
            // Immutable fields excluded: id, eventId, createdAt
            name: tag.name,
            displayOrder: tag.displayOrder,
          },
          where: eq(schema.tags.eventId, tag.eventId),
        });
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save tag",
        error,
      );
    }
  }

  async getMaxTagDisplayOrder(eventId: EventId): Promise<number> {
    try {
      const [result] = await this.db
        .select({ maxOrder: max(schema.tags.displayOrder) })
        .from(schema.tags)
        .where(eq(schema.tags.eventId, eventId));

      return result?.maxOrder ?? -1;
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to get max tag display order",
        error,
      );
    }
  }

  async updateTagDisplayOrders(
    eventId: EventId,
    tagOrders: { tagId: TagId; displayOrder: number }[],
  ): Promise<void> {
    if (tagOrders.length === 0) {
      return;
    }
    try {
      const queries: BatchItem<"sqlite">[] = tagOrders.map((order) =>
        this.db
          .update(schema.tags)
          .set({ displayOrder: order.displayOrder })
          .where(and(eq(schema.tags.id, order.tagId), eq(schema.tags.eventId, eventId))),
      );
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      await this.db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to update tag display orders",
        error,
      );
    }
  }

  async deleteTag(eventId: EventId, tagId: TagId): Promise<void> {
    try {
      await this.db
        .delete(schema.tags)
        .where(and(eq(schema.tags.id, tagId), eq(schema.tags.eventId, eventId)));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to delete tag",
        error,
      );
    }
  }

  // =============================================================================
  // Place operations
  // =============================================================================

  async findPlaces(eventId: EventId): Promise<Place[]> {
    try {
      const rows = await this.db.query.places.findMany({
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
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find places",
        error,
      );
    }
  }

  async savePlace(place: Place): Promise<void> {
    try {
      await this.db
        .insert(schema.places)
        .values({
          id: place.id,
          eventId: place.eventId,
          name: place.name,
          parentId: place.parentId,
          createdAt: place.createdAt,
        })
        .onConflictDoUpdate({
          target: schema.places.id,
          set: {
            // Immutable fields excluded: id, eventId, parentId, createdAt
            // Note: parentId cannot be changed after creation to avoid circular reference complexity
            name: place.name,
          },
          where: eq(schema.places.eventId, place.eventId),
        });
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save place",
        error,
      );
    }
  }

  async deletePlace(eventId: EventId, placeId: PlaceId): Promise<void> {
    try {
      await this.db
        .delete(schema.places)
        .where(and(eq(schema.places.id, placeId), eq(schema.places.eventId, eventId)));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to delete place",
        error,
      );
    }
  }

  // =============================================================================
  // Deadline operations
  // =============================================================================

  async findDeadlines(eventId: EventId): Promise<Deadline[]> {
    try {
      const rows = await this.db.query.deadlines.findMany({
        where: (deadlines, { eq }) => eq(deadlines.eventId, eventId),
      });

      const deadlineList: Deadline[] = rows.map((row) =>
        deadlineSchema.parse({
          id: row.id,
          eventId: row.eventId,
          fieldKey: row.fieldKey,
          startAt: row.startAt ? new Date(row.startAt) : undefined,
          deadlineAt: new Date(row.deadlineAt),
          createdAt: new Date(row.createdAt),
        }),
      );

      return deadlineList;
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find deadlines",
        error,
      );
    }
  }

  async saveDeadline(deadline: Deadline): Promise<void> {
    try {
      await this.db
        .insert(schema.deadlines)
        .values({
          id: deadline.id,
          eventId: deadline.eventId,
          fieldKey: deadline.fieldKey,
          startAt: deadline.startAt ?? null,
          deadlineAt: deadline.deadlineAt,
          createdAt: deadline.createdAt,
        })
        .onConflictDoUpdate({
          target: [schema.deadlines.eventId, schema.deadlines.fieldKey],
          set: {
            startAt: deadline.startAt ?? null,
            deadlineAt: deadline.deadlineAt,
          },
        });
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save deadline",
        error,
      );
    }
  }

  async deleteDeadline(eventId: EventId, deadlineId: DeadlineId): Promise<void> {
    try {
      await this.db
        .delete(schema.deadlines)
        .where(and(eq(schema.deadlines.id, deadlineId), eq(schema.deadlines.eventId, eventId)));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to delete deadline",
        error,
      );
    }
  }

  // =============================================================================
  // Event settings operations
  // =============================================================================

  async findEventSettings(eventId: EventId): Promise<EventSettings | null> {
    try {
      const row = await this.db.query.eventSettings.findFirst({
        where: (eventSettings, { eq }) => eq(eventSettings.eventId, eventId),
      });

      if (!row) {
        return null;
      }

      const settings = eventSettingsSchema.parse({
        eventId: row.eventId,
        webContentDescription: row.webContentDescription,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return settings;
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find event settings",
        error,
      );
    }
  }

  async saveEventSettings(settings: EventSettings): Promise<void> {
    try {
      await this.db
        .insert(schema.eventSettings)
        .values({
          eventId: settings.eventId,
          webContentDescription: settings.webContentDescription,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        })
        .onConflictDoUpdate({
          target: schema.eventSettings.eventId,
          set: {
            webContentDescription: settings.webContentDescription,
            updatedAt: settings.updatedAt,
          },
        });
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save event settings",
        error,
      );
    }
  }
}
