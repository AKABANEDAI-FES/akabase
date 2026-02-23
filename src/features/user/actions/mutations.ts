import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { updateCommitteeRole } from "@/application/command/user/update-committee-role";
import { updateGlobalRole } from "@/application/command/user/update-global-role";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast, eventIdSchema, userIdSchema } from "@/domain/shared/ids";
import type { EventId, UserId } from "@/domain/shared/ids";
import { committeeRoleSchema, globalRoleSchema } from "@/domain/authorization/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadUsersForEventCacheKey, generateLoadUsersWithRolesCacheKey } from "./queries";

export const updateCommitteeRoleInputSchema = z.object({
  userId: userIdSchema,
  eventId: eventIdSchema,
  role: committeeRoleSchema,
});

export const updateCommitteeRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateCommitteeRoleInputSchema)
  .handler(async ({ data, context }) => {
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [cast<EventId>(data.eventId)], // Load permissions for the target event
    });

    if (Result.isFailure(actorResult)) {
      return actorResult;
    }

    const result = await updateCommitteeRole(dependencies, {
      userId: data.userId,
      eventId: data.eventId,
      role: data.role,
      actor: actorResult.value,
    });

    return result;
  });

export function useUpdateCommitteeRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCommitteeRoleFn,
    onSuccess: (result, variables) => {
      Result.inspect(() => {
        queryClient.invalidateQueries({
          queryKey: generateLoadUsersForEventCacheKey(variables.data.eventId),
        });
      })(result);
    },
  });
}

export const updateGlobalRoleInputSchema = z.object({
  userId: userIdSchema,
  role: globalRoleSchema,
});

export const updateGlobalRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateGlobalRoleInputSchema)
  .handler(async ({ data, context }) => {
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [], // No event context needed for global role updates
    });

    if (Result.isFailure(actorResult)) {
      return actorResult;
    }

    const result = await updateGlobalRole(dependencies, {
      userId: data.userId,
      role: data.role,
      actor: actorResult.value,
    });

    return result;
  });

export function useUpdateGlobalRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateGlobalRoleFn,
    onSuccess: Result.inspect(() => {
      queryClient.invalidateQueries({ queryKey: generateLoadUsersWithRolesCacheKey() });
    }),
  });
}
