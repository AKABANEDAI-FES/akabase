import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@archive/result";
import { createTag } from "@archive/application/command/event/create-tag";
import { updateTag } from "@archive/application/command/event/update-tag";
import { deleteTag } from "@archive/application/command/event/delete-tag";
import { reorderTags } from "@archive/application/command/event/reorder-tags";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema, tagIdSchema, tagSchema } from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadTagsCacheKey } from "../queries/tag";

/**
 * Create tag input validation schema
 */
export const createTagInputSchema = z.object({
  eventId: eventIdSchema,
  name: tagSchema.shape.name,
});

/**
 * Server function to create tag
 */
export const createTagFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createTagInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createTag(context.dependencies, {
          eventId: data.eventId,
          name: data.name,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use create tag mutation
 */
export function useCreateTagMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createTagFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadTagsCacheKey(eventId),
      });
    }),
  });
}

/**
 * Update tag input validation schema
 */
export const updateTagInputSchema = z.object({
  tagId: tagIdSchema,
  eventId: eventIdSchema,
  name: tagSchema.shape.name,
});

/**
 * Server function to update tag
 */
export const updateTagFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateTagInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateTag(context.dependencies, {
          tagId: data.tagId,
          eventId: data.eventId,
          name: data.name,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use update tag mutation
 */
export function useUpdateTagMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateTagFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadTagsCacheKey(eventId),
      });
    }),
  });
}

/**
 * Delete tag input validation schema
 */
export const deleteTagInputSchema = z.object({
  tagId: tagIdSchema,
  eventId: eventIdSchema,
});

/**
 * Server function to delete tag
 */
export const deleteTagFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(deleteTagInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await deleteTag(context.dependencies, {
          tagId: data.tagId,
          eventId: data.eventId,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use delete tag mutation
 */
export function useDeleteTagMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: deleteTagFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadTagsCacheKey(eventId),
      });
    }),
  });
}

/**
 * Reorder tags input validation schema
 */
export const reorderTagsInputSchema = z.object({
  eventId: eventIdSchema,
  tagIds: z.array(tagIdSchema),
});

/**
 * Server function to reorder tags
 */
export const reorderTagsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(reorderTagsInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await reorderTags(context.dependencies, {
          eventId: data.eventId,
          tagIds: data.tagIds,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use reorder tags mutation
 */
export function useReorderTagsMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: reorderTagsFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadTagsCacheKey(eventId),
      });
    }),
  });
}
