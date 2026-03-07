import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createTag } from "@/application/command/event/create-tag";
import { updateTag } from "@/application/command/event/update-tag";
import { deleteTag } from "@/application/command/event/delete-tag";
import { reorderTags } from "@/application/command/event/reorder-tags";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, tagIdSchema } from "@/domain/shared/ids";
import type { TagId, UserId } from "@/domain/shared/ids";
import { tagSchema } from "@/domain/event/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadTagsCacheKey } from "../queries/tag";
import { gen } from "@/libs/result";

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
  .middleware([authMiddleware])
  .inputValidator(createTagInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = await resolveActor(dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createTag(dependencies, {
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
export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTagFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
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
  .middleware([authMiddleware])
  .inputValidator(updateTagInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = await resolveActor(dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateTag(dependencies, {
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
export function useUpdateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTagFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
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
  .middleware([authMiddleware])
  .inputValidator(deleteTagInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = await resolveActor(dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await deleteTag(dependencies, {
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
export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTagFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
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
  .middleware([authMiddleware])
  .inputValidator(reorderTagsInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      const actor = await resolveActor(dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await reorderTags(dependencies, {
          eventId: data.eventId,
          tagIds: data.tagIds as TagId[],
          actor,
        }),
      );
    });
  });

/**
 * Hook to use reorder tags mutation
 */
export function useReorderTagsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderTagsFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadTagsCacheKey(eventId),
      });
    }),
  });
}
