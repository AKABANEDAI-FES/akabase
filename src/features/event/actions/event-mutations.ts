import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dependencies } from "@/infrastructure/di";
import { createEvent } from "@/application/command/event/create-event";
import { updateEvent } from "@/application/command/event/update-event";
import { archiveEvent } from "@/application/command/event/archive-event";
import { activateEvent } from "@/application/command/event/activate-event";
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
    const result = await createEvent(dependencies, {
      name: data.name,
      slug: data.slug,
      userId: cast<UserId>(context.session.user.id),
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
    const result = await updateEvent(dependencies, {
      eventId: data.id,
      name: data.name,
      slug: data.slug,
      userId: cast<UserId>(context.session.user.id),
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
    const result = await archiveEvent(dependencies, {
      eventId: data.eventId as EventId,
      userId: cast<UserId>(context.session.user.id),
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
    const result = await activateEvent(dependencies, {
      eventId: data.eventId as EventId,
      userId: cast<UserId>(context.session.user.id),
    });

    return result;
  });
