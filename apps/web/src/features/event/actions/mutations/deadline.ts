import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@archive/result";
import { createDeadline } from "@archive/application/command/event/create-deadline";
import { updateDeadline } from "@archive/application/command/event/update-deadline";
import { deleteDeadline } from "@archive/application/command/event/delete-deadline";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import {
  deadlineIdSchema,
  deadlineRefinement,
  deadlineSchema,
  eventIdSchema,
} from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadDeadlinesCacheKey } from "../queries/deadline";

/**
 * Create deadline input validation schema
 */
export const createDeadlineInputSchema = z.object({
  eventId: eventIdSchema,
  fieldKey: deadlineSchema.shape.fieldKey,
  startAt: z.date().nullable(),
  deadlineAt: z.date(),
});

/**
 * Server function to create deadline
 */
export const createDeadlineFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createDeadlineInputSchema.check(deadlineRefinement))
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createDeadline(context.dependencies, {
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
export function useCreateDeadlineMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createDeadlineFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
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
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateDeadlineInputSchema.check(deadlineRefinement))
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateDeadline(context.dependencies, {
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
export function useUpdateDeadlineMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateDeadlineFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
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
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(deleteDeadlineInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await deleteDeadline(context.dependencies, {
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
export function useDeleteDeadlineMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: deleteDeadlineFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadDeadlinesCacheKey(eventId),
      });
    }),
  });
}
