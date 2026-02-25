import { createServerFn } from "@tanstack/react-start";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createProject } from "@/application/command/project/create-project";
import { updateProjectDraft } from "@/application/command/project/update-project-draft";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, projectIdSchema, tagIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { projectDraftSchema, projectSchema } from "@/domain/project/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadDraftCacheKey, generateLoadProjectsCacheKey } from "./queries";
import { gen } from "@/libs/result";
import { z } from "zod";

/**
 * Create project input validation schema
 */
export const createProjectInputSchema = projectSchema.pick({
  eventId: true,
  orgId: true,
  name: true,
  placeId: true,
  logoKey: true,
});

/**
 * Server function to create project
 */
export const createProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createProjectInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      // Resolve actor with event context
      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [data.eventId],
        }),
      );

      return yield* $(
        await createProject(dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          name: data.name,
          placeId: data.placeId,
          logoKey: data.logoKey,
          actor,
        }),
      );
    });
  });

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProjectFn,
    onSuccess: Result.inspect(({ orgId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadProjectsCacheKey(orgId),
      });
    }),
  });
}

/**
 * Update project draft input validation schema
 * Excludes webContentJson (rich editor) for now
 */
export const updateProjectDraftInputSchema = z.object({
  projectId: projectIdSchema,
  eventId: projectSchema.shape.eventId,
  orgId: projectSchema.shape.orgId,
  pamphletText: projectDraftSchema.shape.pamphletText,
  tags: z.array(tagIdSchema),
});

/**
 * Server function to update project draft
 */
export const updateProjectDraftFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateProjectDraftInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      // Resolve actor with event and organization context
      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [data.eventId],
          orgIds: [data.orgId],
        }),
      );

      // Update draft (webContentJson set to null since rich editor is not implemented yet)
      return yield* $(
        await updateProjectDraft(dependencies, {
          projectId: data.projectId,
          pamphletText: data.pamphletText,
          webContentJson: null,
          tags: data.tags,
          actor,
        }),
      );
    });
  });

export function useUpdateProjectDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProjectDraftFn,
    onSuccess: Result.inspect(({ projectId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadDraftCacheKey(projectId),
      });
    }),
  });
}
