import { createServerFn } from "@tanstack/react-start";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createOrganization } from "@/application/command/organization/create-organization";
import { updateOrganization } from "@/application/command/organization/update-organization";
import { deleteOrganization } from "@/application/command/organization/delete-organization";
import { addOrganizationMember } from "@/application/command/organization/add-organization-member";
import { removeOrganizationMember } from "@/application/command/organization/remove-organization-member";
import { updateOrganizationMemberRole } from "@/application/command/organization/update-organization-member-role";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, orgIdSchema, userIdSchema } from "@/domain/shared/ids";
import type { OrgId, UserId } from "@/domain/shared/ids";
import { z } from "zod";
import { orgMemberRoleSchema, organizationSchema } from "@/domain/organization/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateLoadMyOrganizationsCacheKey,
  generateLoadOrganizationDetailCacheKey,
  generateLoadOrganizationMembersCacheKey,
  generateLoadOrganizationsCacheKey,
} from "./queries";
import { gen } from "@/libs/result";

/**
 * Create organization input validation schema
 */
export const createOrganizationInputSchema = organizationSchema.pick({
  eventId: true,
  name: true,
  description: true,
  logoKey: true,
});

/**
 * Server function to create organization
 */
export const createOrganizationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createOrganizationInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      // Resolve actor with event context
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await createOrganization(dependencies, {
          eventId: data.eventId,
          name: data.name,
          description: data.description,
          logoKey: data.logoKey,
          actor,
        }),
      );
    });
  });

export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrganizationFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationsCacheKey(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadMyOrganizationsCacheKey(eventId),
      });
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
  .middleware([authMiddleware])
  .inputValidator(updateOrganizationInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
        orgIds: [data.id],
      });

      return yield* $(
        await updateOrganization(dependencies, {
          eventId: data.eventId,
          orgId: data.id,
          name: data.name,
          description: data.description,
          actor,
        }),
      );
    });
  });

export function useUpdateOrganizationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrganizationFn,
    onSuccess: Result.inspect(({ organizationId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationDetailCacheKey(eventId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationsCacheKey(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadMyOrganizationsCacheKey(eventId),
      });
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
  .middleware([authMiddleware])
  .inputValidator(deleteOrganizationInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
        orgIds: [data.orgId],
      });

      return yield* $(
        await deleteOrganization(dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          actor,
        }),
      );
    });
  });

export function useDeleteOrganizationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOrganizationFn,
    onSuccess: Result.inspect(({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationsCacheKey(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadMyOrganizationsCacheKey(eventId),
      });
    }),
  });
}

/**
 * Add organization member input validation schema
 */
export const addOrganizationMemberInputSchema = z.object({
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  userId: userIdSchema,
  role: orgMemberRoleSchema,
});

/**
 * Server function to add a member to an organization
 */
export const addOrganizationMemberFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(addOrganizationMemberInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
        orgIds: [data.orgId],
      });

      return yield* $(
        await addOrganizationMember(dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          userId: data.userId,
          role: data.role,
          actor,
        }),
      );
    });
  });

export function useAddOrganizationMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addOrganizationMemberFn,
    onSuccess: Result.inspect(({ orgId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadMyOrganizationsCacheKey(eventId),
      });
    }),
  });
}

/**
 * Remove organization member input validation schema
 */
export const removeOrganizationMemberInputSchema = z.object({
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  userId: userIdSchema,
});

/**
 * Server function to remove a member from an organization
 */
export const removeOrganizationMemberFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(removeOrganizationMemberInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
        orgIds: [data.orgId],
      });

      return yield* $(
        await removeOrganizationMember(dependencies, {
          eventId: data.eventId,
          orgId: data.orgId as OrgId,
          userId: data.userId,
          actor,
        }),
      );
    });
  });

export function useRemoveOrganizationMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeOrganizationMemberFn,
    onSuccess: Result.inspect(({ orgId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadMyOrganizationsCacheKey(eventId),
      });
    }),
  });
}

/**
 * Update organization member role input validation schema
 */
export const updateOrganizationMemberRoleInputSchema = z.object({
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  userId: userIdSchema,
  role: orgMemberRoleSchema,
});

/**
 * Server function to update a member's role
 */
export const updateOrganizationMemberRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateOrganizationMemberRoleInputSchema)
  .handler(async ({ data, context }) => {
    return gen(async function* ($) {
      const actor = await resolveActor({
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
        orgIds: [data.orgId],
      });

      return yield* $(
        await updateOrganizationMemberRole(dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          userId: data.userId,
          role: data.role,
          actor,
        }),
      );
    });
  });

export function useUpdateOrganizationMemberRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrganizationMemberRoleFn,
    onSuccess: Result.inspect(({ orgId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadMyOrganizationsCacheKey(eventId),
      });
    }),
  });
}
