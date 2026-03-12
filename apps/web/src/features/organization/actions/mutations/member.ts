import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@archive/result";
import { addOrganizationMember } from "@archive/application/command/organization/add-organization-member";
import { removeOrganizationMember } from "@archive/application/command/organization/remove-organization-member";
import { updateOrganizationMemberRole } from "@archive/application/command/organization/update-organization-member-role";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema } from "@archive/domain/event/schema";
import { orgIdSchema, orgMemberRoleSchema } from "@archive/domain/organization/schema";
import { userIdSchema } from "@archive/domain/user/schema";
import type { UserId } from "@archive/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadMyOrganizationsCacheKey } from "../queries";
import { generateLoadOrganizationMembersCacheKey } from "../queries/member";

/**
 * Add organization member input validation schema
 */
export const addOrganizationMemberInputSchema = z.object({
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  email: z
    .email({ error: "メールアドレスを入力してください" })
    .endsWith("@toyo.jp", { error: "東洋大学のメールアドレスを入力してください" }),
  role: orgMemberRoleSchema,
});

/**
 * Server function to add a member to an organization
 */
export const addOrganizationMemberFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(addOrganizationMemberInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await addOrganizationMember(context.dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          email: data.email,
          role: data.role,
          actor,
        }),
      );
    });
  });

export function useAddOrganizationMemberMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: addOrganizationMemberFn,
    onSuccess: Result.inspect(async ({ orgId, eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadMyOrganizationsCacheKey(eventId),
        }),
      ]);
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
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(removeOrganizationMemberInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await removeOrganizationMember(context.dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          userId: data.userId,
          actor,
        }),
      );
    });
  });

export function useRemoveOrganizationMemberMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: removeOrganizationMemberFn,
    onSuccess: Result.inspect(async ({ orgId, eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadMyOrganizationsCacheKey(eventId),
        }),
      ]);
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
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateOrganizationMemberRoleInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateOrganizationMemberRole(context.dependencies, {
          eventId: data.eventId,
          orgId: data.orgId,
          userId: data.userId,
          role: data.role,
          actor,
        }),
      );
    });
  });

export function useUpdateOrganizationMemberRoleMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateOrganizationMemberRoleFn,
    onSuccess: Result.inspect(async ({ orgId, eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadMyOrganizationsCacheKey(eventId),
        }),
      ]);
    }),
  });
}
