import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@akabase/result";
import { createProjectCategory } from "@akabase/application/command/event/create-project-category";
import { updateProjectCategory } from "@akabase/application/command/event/update-project-category";
import { deleteProjectCategory } from "@akabase/application/command/event/delete-project-category";
import { reorderProjectCategories } from "@akabase/application/command/event/reorder-project-categories";
import { resolveActor } from "@akabase/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import {
  eventIdSchema,
  projectCategoryIdSchema,
  projectCategorySchema,
} from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadProjectCategoriesCacheKey } from "../queries/project-category";

/**
 * Create project category input validation schema
 */
export const createProjectCategoryInputSchema = z.object({
  eventId: eventIdSchema,
  name: projectCategorySchema.shape.name,
});

/**
 * Server function to create project category
 */
export const createProjectCategoryFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createProjectCategoryInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createProjectCategory(context.dependencies, {
          eventId: data.eventId,
          name: data.name,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use create project category mutation
 */
export function useCreateProjectCategoryMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createProjectCategoryFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadProjectCategoriesCacheKey(eventId),
      });
    }),
  });
}

/**
 * Update project category input validation schema
 */
export const updateProjectCategoryInputSchema = z.object({
  categoryId: projectCategoryIdSchema,
  eventId: eventIdSchema,
  name: projectCategorySchema.shape.name,
});

/**
 * Server function to update project category
 */
export const updateProjectCategoryFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateProjectCategoryInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateProjectCategory(context.dependencies, {
          categoryId: data.categoryId,
          eventId: data.eventId,
          name: data.name,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use update project category mutation
 */
export function useUpdateProjectCategoryMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateProjectCategoryFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadProjectCategoriesCacheKey(eventId),
      });
    }),
  });
}

/**
 * Delete project category input validation schema
 */
export const deleteProjectCategoryInputSchema = z.object({
  categoryId: projectCategoryIdSchema,
  eventId: eventIdSchema,
});

/**
 * Server function to delete project category
 */
export const deleteProjectCategoryFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(deleteProjectCategoryInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await deleteProjectCategory(context.dependencies, {
          categoryId: data.categoryId,
          eventId: data.eventId,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use delete project category mutation
 */
export function useDeleteProjectCategoryMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: deleteProjectCategoryFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadProjectCategoriesCacheKey(eventId),
      });
    }),
  });
}

/**
 * Reorder project categories input validation schema
 */
export const reorderProjectCategoriesInputSchema = z.object({
  eventId: eventIdSchema,
  categoryIds: z.array(projectCategoryIdSchema),
});

/**
 * Server function to reorder project categories
 */
export const reorderProjectCategoriesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(reorderProjectCategoriesInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await reorderProjectCategories(context.dependencies, {
          eventId: data.eventId,
          categoryIds: data.categoryIds,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use reorder project categories mutation
 */
export function useReorderProjectCategoriesMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: reorderProjectCategoriesFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadProjectCategoriesCacheKey(eventId),
      });
    }),
  });
}
