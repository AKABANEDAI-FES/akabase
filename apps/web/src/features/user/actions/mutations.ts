import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@akabase/result";
import { updateCommitteeRole } from "@akabase/application/command/user/update-committee-role";
import { updateGlobalRole } from "@akabase/application/command/user/update-global-role";
import { resolveActor } from "@akabase/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import { userIdSchema } from "@akabase/domain/user/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { committeeRoleSchema, globalRoleSchema } from "@akabase/domain/authorization/schema";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadUsersForEventCacheKey, generateLoadUsersWithRolesCacheKey } from "./queries";

export const updateCommitteeRoleInputSchema = z.object({
  userId: userIdSchema,
  eventId: eventIdSchema,
  role: committeeRoleSchema,
});

export const updateCommitteeRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateCommitteeRoleInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await updateCommitteeRole(context.dependencies, {
          userId: data.userId,
          eventId: data.eventId,
          role: data.role,
          actor,
        }),
      );
    });
  });

export function useUpdateCommitteeRoleMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateCommitteeRoleFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadUsersForEventCacheKey(eventId),
      });
    }),
  });
}

export const updateGlobalRoleInputSchema = z.object({
  userId: userIdSchema,
  role: globalRoleSchema,
});

export const updateGlobalRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(updateGlobalRoleInputSchema)
  .handler(async ({ data, context }) => {
    return Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [],
      });

      return yield* $(
        await updateGlobalRole(context.dependencies, {
          userId: data.userId,
          role: data.role,
          actor,
        }),
      );
    });
  });

export function useUpdateGlobalRoleMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: updateGlobalRoleFn,
    onSuccess: Result.inspect(async () => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadUsersWithRolesCacheKey(),
      });
    }),
  });
}
