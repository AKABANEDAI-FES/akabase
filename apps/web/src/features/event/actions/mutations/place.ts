import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@archive/result";
import { createPlace } from "@archive/application/command/event/create-place";
import { updatePlace } from "@archive/application/command/event/update-place";
import { deletePlace } from "@archive/application/command/event/delete-place";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema, placeIdSchema, placeSchema } from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadPlacesCacheKey } from "../queries/place";

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
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createPlaceInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createPlace(context.dependencies, {
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
export function useCreatePlaceMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createPlaceFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
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
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updatePlaceInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updatePlace(context.dependencies, {
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
export function useUpdatePlaceMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updatePlaceFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
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
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(deletePlaceInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await deletePlace(context.dependencies, {
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
export function useDeletePlaceMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: deletePlaceFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadPlacesCacheKey(eventId),
      });
    }),
  });
}
