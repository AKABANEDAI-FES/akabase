import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { eventSchema } from "@/domain/event/schema";
import type { Event } from "@/domain/event/schema";
import type { EventId } from "@/domain/shared/ids";
import type { EventRepository, RepositoryError } from "./interfaces";
import { repositoryError } from "./interfaces";

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
      await db.insert(events).values({
        id: event.id,
        name: event.name,
        slug: event.slug,
        status: event.status,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      });

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save event", error));
    }
  }

  async updateEvent(event: Event): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .update(events)
        .set({
          name: event.name,
          slug: event.slug,
          status: event.status,
          updatedAt: event.updatedAt,
        })
        .where(eq(events.id, event.id));

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to update event", error));
    }
  }

  // Tag, Place, Deadline methods are not implemented yet (not needed for MVP)
  async findTags(): Promise<Result.Result<never[], RepositoryError>> {
    throw new Error("Not implemented");
  }

  async findPlaces(): Promise<Result.Result<never[], RepositoryError>> {
    throw new Error("Not implemented");
  }

  async findDeadlines(): Promise<Result.Result<never[], RepositoryError>> {
    throw new Error("Not implemented");
  }

  async saveTag(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }

  async updateTag(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }

  async deleteTag(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }

  async savePlace(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }

  async updatePlace(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }

  async deletePlace(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }

  async saveDeadline(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }

  async deleteDeadline(): Promise<Result.Result<void, RepositoryError>> {
    throw new Error("Not implemented");
  }
}
