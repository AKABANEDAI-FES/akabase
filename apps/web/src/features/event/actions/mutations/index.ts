import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@archive/result";
import { createEvent } from "@archive/application/command/event/create-event";
import { updateEvent } from "@archive/application/command/event/update-event";
import { archiveEvent } from "@archive/application/command/event/archive-event";
import { activateEvent } from "@archive/application/command/event/activate-event";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema, eventSchema } from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadEventDetailCacheKey, generateLoadEventsCacheKey } from "../queries";

/**
 * Create event input validation schema
 */
export const createEventInputSchema = eventSchema.pick({ name: true, slug: true });

/**
 * Server function to create event
 */
export const createEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createEventInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
      });

      return yield* $(
        await createEvent(context.dependencies, {
          name: data.name,
          slug: data.slug,
          actor,
        }),
      );
    });
  });

export function useCreateEventMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createEventFn,
    onSuccess: Result.inspect(async () => {
      await queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() });
    }),
  });
}

/**
 * Update event input validation schema
 */
export const updateEventInputSchema = eventSchema.pick({ id: true, name: true, slug: true });

/**
 * Server function to update event
 */
export const updateEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateEventInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.id],
      });

      return yield* $(
        await updateEvent(context.dependencies, {
          eventId: data.id,
          name: data.name,
          slug: data.slug,
          actor,
        }),
      );
    });
  });

export function useUpdateEventMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateEventFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() }),
        queryClient.invalidateQueries({ queryKey: generateLoadEventDetailCacheKey(eventId) }),
      ]);
    }),
  });
}

/**
 * Server function to archive event
 */
export const archiveEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await archiveEvent(context.dependencies, {
          eventId: data.eventId,
          actor,
        }),
      );
    });
  });

export function useArchiveEventMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: archiveEventFn,
    onSuccess: Result.inspect(async () => {
      await queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() });
    }),
  });
}

/**
 * Server function to activate event
 */
export const activateEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await activateEvent(context.dependencies, {
          eventId: data.eventId,
          actor,
        }),
      );
    });
  });

export function useActivateEventMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: activateEventFn,
    onSuccess: Result.inspect(async () => {
      await queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() });
    }),
  });
}
