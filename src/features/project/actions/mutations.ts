import { createServerFn } from "@tanstack/react-start";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createProject } from "@/application/command/project/create-project";
import { updateProjectDraft } from "@/application/command/project/update-project-draft";
import { submitProject } from "@/application/command/project/submit-project";
import { approveProject } from "@/application/command/project/approve-project";
import { returnProject } from "@/application/command/project/return-project";
import { withdrawSubmission } from "@/application/command/project/withdraw-submission";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, projectIdSchema, submissionIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import {
  draftWithTagsSchema,
  projectSchema,
  submissionMessageSchema,
} from "@/domain/project/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateLoadDraftCacheKey,
  generateLoadEventSubmissionsCacheKey,
  generateLoadProjectsCacheKey,
  generateLoadSubmissionDetailCacheKey,
  generateLoadSubmissionDetailForOrgCacheKey,
  generateLoadSubmissionsCacheKey,
} from "./queries";
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
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

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
    onSuccess: Result.inspect(({ orgId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadProjectsCacheKey(eventId, orgId),
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
  pamphletText: draftWithTagsSchema.shape.pamphletText,
  tags: draftWithTagsSchema.shape.tags,
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
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
        orgIds: [data.orgId],
      });

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
    onSuccess: Result.inspect(({ projectId, eventId, orgId }) => {
      queryClient.invalidateQueries({
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
  .middleware([authMiddleware])
  .inputValidator(submitProjectInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
        orgIds: [data.orgId],
      });

      return yield* $(
        await submitProject(dependencies, {
          projectId: data.projectId,
          actor,
          message: data.message ?? undefined,
        }),
      );
    });
  });

export function useSubmitProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitProjectFn,
    onSuccess: Result.inspect(({ projectId, eventId, orgId, submissionId }) => {
      // Invalidate draft cache
      queryClient.invalidateQueries({
        queryKey: generateLoadDraftCacheKey(eventId, orgId, projectId),
      });
      // Invalidate project-specific submissions cache
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
      });
      // Invalidate event-wide submissions cache
      queryClient.invalidateQueries({
        queryKey: generateLoadEventSubmissionsCacheKey(eventId),
      });
      // Invalidate submission detail cache (org view)
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionDetailForOrgCacheKey(
          eventId,
          orgId,
          projectId,
          submissionId,
        ),
      });
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
  .middleware([authMiddleware])
  .inputValidator(approveProjectInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await approveProject(dependencies, {
          submissionId: data.submissionId,
          actor,
          message: data.message ?? undefined,
        }),
      );
    });
  });

export function useApproveProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveProjectFn,
    onSuccess: Result.inspect(({ submissionId, eventId }) => {
      // Invalidate submission detail cache
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
      });
      // Invalidate event-wide submissions cache
      queryClient.invalidateQueries({
        queryKey: generateLoadEventSubmissionsCacheKey(eventId),
      });
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
  .middleware([authMiddleware])
  .inputValidator(returnProjectInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await returnProject(dependencies, {
          submissionId: data.submissionId,
          actor,
          reason: data.reason,
        }),
      );
    });
  });

/**
 * React hook for return project mutation
 */
export function useReturnProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnProjectFn,
    onSuccess: Result.inspect(({ projectId, eventId, orgId, submissionId }) => {
      // Invalidate submission detail cache
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
      });
      // Invalidate project-specific submissions cache
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
      });
      // Invalidate event-wide submissions cache
      queryClient.invalidateQueries({
        queryKey: generateLoadEventSubmissionsCacheKey(eventId),
      });
      // Invalidate draft cache (returned submissions can be edited again)
      queryClient.invalidateQueries({
        queryKey: generateLoadDraftCacheKey(eventId, orgId, projectId),
      });
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
  reason: submissionMessageSchema.shape.message.optional(), // 取り下げ理由（任意）
});

/**
 * Server function to withdraw a submission
 */
export const withdrawSubmissionFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(withdrawSubmissionInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await withdrawSubmission(dependencies, {
          submissionId: data.submissionId,
          actor,
          reason: data.reason,
        }),
      );
    });
  });

/**
 * React hook for withdraw submission mutation
 */
export function useWithdrawSubmissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: withdrawSubmissionFn,
    onSuccess: Result.inspect(({ projectId, eventId, orgId, submissionId }) => {
      // Invalidate submission detail cache (committee view)
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionDetailCacheKey(eventId, submissionId),
      });
      // Invalidate submission detail cache (org view)
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionDetailForOrgCacheKey(
          eventId,
          orgId,
          projectId,
          submissionId,
        ),
      });
      // Invalidate project-specific submissions cache
      queryClient.invalidateQueries({
        queryKey: generateLoadSubmissionsCacheKey(eventId, orgId, projectId),
      });
      // Invalidate event-wide submissions cache
      queryClient.invalidateQueries({
        queryKey: generateLoadEventSubmissionsCacheKey(eventId),
      });
    }),
  });
}
