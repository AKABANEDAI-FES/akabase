import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { updateDeadline } from "@/application/command/event/update-deadline";
import { deleteDeadline } from "@/application/command/event/delete-deadline";
import { createDeadline } from "@/application/command/event/create-deadline";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, deadlineIdSchema, eventIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadDeadlinesCacheKey } from "../queries/deadline";
import { gen } from "@/libs/result";
import { deadlineRefinement, deadlineSchema } from "@/domain/event/schema";

/**
 * Create deadline input validation schema
 */
export const createDeadlineInputSchema = z.object({
  eventId: eventIdSchema,
  fieldKey: deadlineSchema.shape.fieldKey, // Use the same enum validation as the domain schema
  startAt: z.date().nullable(), // Use the same optional date validation as the domain schema
  deadlineAt: z.date(), // Use the same date validation as the domain schema
});

/**
 * Server function to create deadline
 */
export const createDeadlineFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createDeadlineInputSchema.check(deadlineRefinement))
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = await resolveActor(dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createDeadline(dependencies, {
          eventId: data.eventId,
          fieldKey: data.fieldKey,
          startAt: data.startAt ?? undefined,
          deadlineAt: data.deadlineAt,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use create deadline mutation
 */
export function useCreateDeadlineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDeadlineFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadDeadlinesCacheKey(eventId),
      });
    }),
  });
}

/**
 * Update deadline input validation schema
 * Note: fieldKey is immutable and cannot be changed after creation
 */
export const updateDeadlineInputSchema = z.object({
  deadlineId: deadlineIdSchema,
  eventId: eventIdSchema,
  startAt: z.date().nullable(),
  deadlineAt: z.date(),
});

/**
 * Server function to update deadline
 */
export const updateDeadlineFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateDeadlineInputSchema.check(deadlineRefinement))
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = await resolveActor(dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateDeadline(dependencies, {
          deadlineId: data.deadlineId,
          eventId: data.eventId,
          startAt: data.startAt ?? undefined,
          deadlineAt: data.deadlineAt,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use update deadline mutation
 */
export function useUpdateDeadlineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDeadlineFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadDeadlinesCacheKey(eventId),
      });
    }),
  });
}

/**
 * Delete deadline input validation schema
 */
export const deleteDeadlineInputSchema = z.object({
  deadlineId: deadlineIdSchema,
  eventId: eventIdSchema,
});

/**
 * Server function to delete deadline
 */
export const deleteDeadlineFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(deleteDeadlineInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = await resolveActor(dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await deleteDeadline(dependencies, {
          deadlineId: data.deadlineId,
          eventId: data.eventId,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use delete deadline mutation
 */
export function useDeleteDeadlineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDeadlineFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadDeadlinesCacheKey(eventId),
      });
    }),
  });
}
