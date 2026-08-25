import { createServerFn } from "@tanstack/react-start";
import { Result } from "@akabase/result";
import { createProject } from "@akabase/application/command/project/create-project";
import { updateProjectDraft } from "@akabase/application/command/project/update-project-draft";
import { updateProject } from "@akabase/application/command/project/update-project";
import { updatePublished } from "@akabase/application/command/project/update-published";
import { submitProject } from "@akabase/application/command/project/submit-project";
import { approveProject } from "@akabase/application/command/project/approve-project";
import { returnProject } from "@akabase/application/command/project/return-project";
import { withdrawSubmission } from "@akabase/application/command/project/withdraw-submission";
import { resolveActor } from "@akabase/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import {
  draftWithTagsSchema,
  projectIdSchema,
  projectPublishedSchema,
  projectSchema,
  submissionIdSchema,
  submissionMessageSchema,
} from "@akabase/domain/project/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import {
  generateLoadDraftCacheKey,
  generateLoadEventSubmissionsCacheKey,
  generateLoadProjectDetailCacheKey,
  generateLoadProjectPublishedCacheKey,
  generateLoadProjectsCacheKey,
  generateLoadSubmissionDetailCacheKey,
  generateLoadSubmissionsCacheKey,
} from "../queries";
import { z } from "zod";

/**
 * Create project input validation schema
 */
export const createProjectInputSchema = projectSchema.pick({
  eventId: true,
  orgId: true,
  name: true,
  placeId: true,
  logoImageId: true,
  contestVoteNumber: true,
});

/**
 * Server function to create project
 */
export const createProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createProjectInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      try {
        return yield* $(
          await createProject(context.dependencies, {
            eventId: data.eventId,
            orgId: data.orgId,
            name: data.name,
            placeId: data.placeId,
            logoImageId: data.logoImageId,
            contestVoteNumber: data.contestVoteNumber,
            actor,
          }),
        );
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

export function useCreateProjectMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createProjectFn,
    onSuccess: Result.inspect(async ({ orgId, eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadProjectsCacheKey(eventId, orgId),
      });
    }),
  });
}

/**
 * Update project draft input validation schema
 */
export const updateProjectDraftInputSchema = z.object({
  projectId: projectIdSchema,
  eventId: projectSchema.shape.eventId,
  orgId: projectSchema.shape.orgId,
  pamphletText: draftWithTagsSchema.shape.pamphletText,
  tags: draftWithTagsSchema.shape.tags,
  webContentJson: draftWithTagsSchema.shape.webContentJson,
  openingHours: draftWithTagsSchema.shape.openingHours,
});

/**
 * Server function to update project draft
 */
export const updateProjectDraftFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateProjectDraftInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateProjectDraft(context.dependencies, {
          projectId: data.projectId,
          pamphletText: data.pamphletText,
          webContentJson: data.webContentJson,
          openingHours: data.openingHours,
          tags: data.tags,
          actor,
        }),
      );
    });
  });

export function useUpdateProjectDraftMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateProjectDraftFn,
    onSuccess: Result.inspect(async ({ projectId, eventId, orgId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadDraftCacheKey(eventId, orgId, projectId),
      });
    }),
  });
}

/**
 * Submit project input validation schema
 */
export const submitProjectInputSchema = z.object({
  projectId: projectIdSchema,
  eventId: projectSchema.shape.eventId,
  orgId: projectSchema.shape.orgId,
  message: submissionMessageSchema.shape.message.nullable(),
});

/**
 * Server function to submit project
 */
export const submitProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(submitProjectInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await submitProject(context.dependencies, {
          projectId: data.projectId,
          actor,
          message: data.message ?? undefined,
        }),
      );
    });
  });

export function useSubmitProjectMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: submitProjectFn,
    onSuccess: Result.inspect(async ({ projectId, eventId, orgId, submissionId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadDraftCacheKey(eventId, orgId, projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadEventSubmissionsCacheKey(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
        }),
      ]);
    }),
  });
}

/**
 * Approve project input validation schema
 */
export const approveProjectInputSchema = z.object({
  submissionId: submissionIdSchema,
  eventId: projectSchema.shape.eventId,
  message: submissionMessageSchema.shape.message.nullable(),
});

/**
 * Server function to approve project submission
 */
export const approveProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(approveProjectInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await approveProject(context.dependencies, {
          submissionId: data.submissionId,
          actor,
          message: data.message ?? undefined,
        }),
      );
    });
  });

export function useApproveProjectMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: approveProjectFn,
    onSuccess: Result.inspect(async ({ submissionId, eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadEventSubmissionsCacheKey(eventId),
        }),
      ]);
    }),
  });
}

/**
 * Return project input validation schema
 */
export const returnProjectInputSchema = z.object({
  submissionId: submissionIdSchema,
  eventId: projectSchema.shape.eventId,
  orgId: projectSchema.shape.orgId,
  projectId: projectIdSchema,
  reason: submissionMessageSchema.shape.message,
});

/**
 * Server function to return a submission
 */
export const returnProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(returnProjectInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await returnProject(context.dependencies, {
          submissionId: data.submissionId,
          actor,
          reason: data.reason,
        }),
      );
    });
  });

export function useReturnProjectMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: returnProjectFn,
    onSuccess: Result.inspect(async ({ projectId, eventId, orgId, submissionId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadEventSubmissionsCacheKey(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadDraftCacheKey(eventId, orgId, projectId),
        }),
      ]);
    }),
  });
}

/**
 * Withdraw submission input validation schema
 */
export const withdrawSubmissionInputSchema = z.object({
  submissionId: submissionIdSchema,
  eventId: projectSchema.shape.eventId,
  orgId: projectSchema.shape.orgId,
  projectId: projectIdSchema,
  reason: submissionMessageSchema.shape.message.optional(),
});

/**
 * Server function to withdraw a submission
 */
export const withdrawSubmissionFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(withdrawSubmissionInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await withdrawSubmission(context.dependencies, {
          submissionId: data.submissionId,
          actor,
          reason: data.reason,
        }),
      );
    });
  });

export function useWithdrawSubmissionMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: withdrawSubmissionFn,
    onSuccess: Result.inspect(async ({ projectId, eventId, orgId, submissionId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadEventSubmissionsCacheKey(eventId),
        }),
      ]);
    }),
  });
}

/**
 * =============================================================================
 * Update Project (metadata: name, placeId)
 * =============================================================================
 */

export const updateProjectInputSchema = z.object({
  projectId: projectIdSchema,
  eventId: projectSchema.shape.eventId,
  orgId: projectSchema.shape.orgId,
  name: projectSchema.shape.name,
  placeId: projectSchema.shape.placeId,
  categoryId: projectSchema.shape.categoryId,
  logoImageId: projectSchema.shape.logoImageId,
  contestVoteNumber: projectSchema.shape.contestVoteNumber,
});

export const updateProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateProjectInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });
      const result = yield* $(await updateProject(context.dependencies, { ...data, actor }));
      return result;
    });
  });

export function useUpdateProjectMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateProjectFn,
    onSuccess: Result.inspect(async ({ projectId, eventId, orgId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadProjectsCacheKey(eventId, orgId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadProjectDetailCacheKey(eventId, orgId, projectId),
        }),
      ]);
    }),
  });
}

/**
 * =============================================================================
 * Update Published (content: pamphletText, webContentJson, tags)
 * =============================================================================
 */

export const updatePublishedInputSchema = z.object({
  projectId: projectIdSchema,
  eventId: projectSchema.shape.eventId,
  orgId: projectSchema.shape.orgId,
  pamphletText: draftWithTagsSchema.shape.pamphletText,
  webContentJson: draftWithTagsSchema.shape.webContentJson,
  openingHours: projectPublishedSchema.shape.openingHours,
  tags: draftWithTagsSchema.shape.tags,
});

export const updatePublishedFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updatePublishedInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });
      const result = yield* $(await updatePublished(context.dependencies, { ...data, actor }));
      return result;
    });
  });

export function useUpdatePublishedMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updatePublishedFn,
    onSuccess: Result.inspect(async ({ projectId, eventId, orgId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "published"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadProjectsCacheKey(eventId, orgId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadProjectPublishedCacheKey(eventId, orgId, projectId),
        }),
      ]);
    }),
  });
}
