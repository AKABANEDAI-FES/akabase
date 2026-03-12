import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@archive/result";
import { createOrganization } from "@archive/application/command/organization/create-organization";
import { updateOrganization } from "@archive/application/command/organization/update-organization";
import { deleteOrganization } from "@archive/application/command/organization/delete-organization";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema } from "@archive/domain/event/schema";
import { orgIdSchema, organizationSchema } from "@archive/domain/organization/schema";
import type { UserId } from "@archive/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import {
  generateLoadMyOrganizationsCacheKey,
  generateLoadOrganizationDetailCacheKey,
  generateLoadOrganizationsCacheKey,
} from "../queries";

/**
 * Create organization input validation schema
 */
export const createOrganizationInputSchema = organizationSchema.pick({
  eventId: true,
  name: true,
  description: true,
  logoImageId: true,
});

/**
 * Server function to create organization
 */
export const createOrganizationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createOrganizationInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createOrganization(context.dependencies, {
          eventId: data.eventId,
          name: data.name,
          description: data.description,
          logoImageId: data.logoImageId,
          actor,
        }),
      );
    });
  });

export function useCreateOrganizationMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createOrganizationFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationsCacheKey(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadMyOrganizationsCacheKey(eventId),
        }),
      ]);
    }),
  });
}

/**
 * Update organization input validation schema
 */
export const updateOrganizationInputSchema = organizationSchema.pick({
  eventId: true,
  id: true,
  name: true,
  description: true,
});

/**
 * Server function to update organization
 */
export const updateOrganizationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateOrganizationInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateOrganization(context.dependencies, {
          eventId: data.eventId,
          orgId: data.id,
          name: data.name,
          description: data.description,
          actor,
        }),
      );
    });
  });

export function useUpdateOrganizationMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateOrganizationFn,
    onSuccess: Result.inspect(async ({ organizationId, eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationDetailCacheKey(eventId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationsCacheKey(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadMyOrganizationsCacheKey(eventId),
        }),
      ]);
    }),
  });
}

/**
 * Delete organization input validation schema
 */
export const deleteOrganizationInputSchema = z.object({
  eventId: eventIdSchema,
  orgId: orgIdSchema,
});

/**
 * Server function to delete organization
 */
export const deleteOrganizationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(deleteOrganizationInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await deleteOrganization(context.dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          actor,
        }),
      );
    });
  });

export function useDeleteOrganizationMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: deleteOrganizationFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationsCacheKey(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadMyOrganizationsCacheKey(eventId),
        }),
      ]);
    }),
  });
}
