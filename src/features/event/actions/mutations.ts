import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createEvent } from "@/application/command/event/create-event";
import { updateEvent } from "@/application/command/event/update-event";
import { archiveEvent } from "@/application/command/event/archive-event";
import { activateEvent } from "@/application/command/event/activate-event";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema } from "@/domain/shared/ids";
import type { EventId, UserId } from "@/domain/shared/ids";
import { eventSchema } from "@/domain/event/schema";

/**
 * Create event input validation schema
 */
export const createEventInputSchema = eventSchema.pick({ name: true, slug: true });

/**
 * Update event input validation schema
 */
export const updateEventInputSchema = eventSchema.pick({ id: true, name: true, slug: true });

/**
 * Server function to create event
 */
export const createEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createEventInputSchema)
  .handler(async ({ data, context }) => {
    // Resolve actor from session (no event context needed for creation)
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const result = await createEvent(dependencies, {
      name: data.name,
      slug: data.slug,
      actor: actorResult.value,
    });

    return result;
  });

/**
 * Server function to update event
 */
export const updateEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateEventInputSchema)
  .handler(async ({ data, context }) => {
    // Resolve actor with event context
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [cast<EventId>(data.id)],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const result = await updateEvent(dependencies, {
      eventId: data.id,
      name: data.name,
      slug: data.slug,
      actor: actorResult.value,
    });

    return result;
  });

/**
 * Server function to archive event
 */
export const archiveEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    // Resolve actor with event context
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [cast<EventId>(data.eventId)],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const result = await archiveEvent(dependencies, {
      eventId: cast<EventId>(data.eventId),
      actor: actorResult.value,
    });

    return result;
  });

/**
 * Server function to activate event
 */
export const activateEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    // Resolve actor with event context
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [cast<EventId>(data.eventId)],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const result = await activateEvent(dependencies, {
      eventId: cast<EventId>(data.eventId),
      actor: actorResult.value,
    });

    return result;
  });
