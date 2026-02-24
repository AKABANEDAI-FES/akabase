import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createPlace } from "@/application/command/event/create-place";
import { updatePlace } from "@/application/command/event/update-place";
import { deletePlace } from "@/application/command/event/delete-place";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, placeIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { placeSchema } from "@/domain/event/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadPlacesCacheKey } from "../queries/place";
import { gen } from "@/libs/result";

/**
 * Create place input validation schema
 */
export const createPlaceInputSchema = z.object({
  eventId: eventIdSchema,
  name: placeSchema.shape.name,
  parentId: placeSchema.shape.parentId,
});

/**
 * Server function to create place
 */
export const createPlaceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createPlaceInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [data.eventId],
        }),
      );

      return yield* $(
        await createPlace(dependencies, {
          eventId: data.eventId,
          name: data.name,
          parentId: data.parentId,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use create place mutation
 */
export function useCreatePlaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlaceFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadPlacesCacheKey(eventId),
      });
    }),
  });
}

/**
 * Update place input validation schema
 * Note: parentId cannot be changed after creation
 */
export const updatePlaceInputSchema = z.object({
  placeId: placeIdSchema,
  eventId: eventIdSchema,
  name: placeSchema.shape.name,
});

/**
 * Server function to update place
 */
export const updatePlaceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updatePlaceInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [data.eventId],
        }),
      );

      return yield* $(
        await updatePlace(dependencies, {
          placeId: data.placeId,
          eventId: data.eventId,
          name: data.name,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use update place mutation
 */
export function useUpdatePlaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlaceFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadPlacesCacheKey(eventId),
      });
    }),
  });
}

/**
 * Delete place input validation schema
 */
export const deletePlaceInputSchema = z.object({
  placeId: placeIdSchema,
  eventId: eventIdSchema,
});

/**
 * Server function to delete place
 */
export const deletePlaceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(deletePlaceInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [data.eventId],
        }),
      );

      return yield* $(
        await deletePlace(dependencies, {
          placeId: data.placeId,
          eventId: data.eventId,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use delete place mutation
 */
export function useDeletePlaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlaceFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadPlacesCacheKey(eventId),
      });
    }),
  });
}
