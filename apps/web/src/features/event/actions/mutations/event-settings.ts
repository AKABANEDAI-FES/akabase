import { createServerFn } from "@tanstack/react-start";
import { Result } from "@akabase/result";
import { upsertEventSettings } from "@akabase/application/command/event/upsert-event-settings";
import { resolveActor } from "@akabase/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import { eventSettingsSchema } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadEventSettingsCacheKey } from "../queries/event-settings";

/**
 * Upsert event settings input validation schema
 */
export const upsertEventSettingsInputSchema = eventSettingsSchema.pick({
  eventId: true,
  webContentDescription: true,
  pamphletTextMaxLength: true,
});

/**
 * Server function to upsert event settings
 */
export const upsertEventSettingsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(upsertEventSettingsInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
        eventIds: [data.eventId],
      });

      return yield* $(
        await upsertEventSettings(context.dependencies, {
          eventId: data.eventId,
          webContentDescription: data.webContentDescription,
          pamphletTextMaxLength: data.pamphletTextMaxLength,
          actor,
        }),
      );
    });
  });

/**
 * Hook to use upsert event settings mutation
 */
export function useUpsertEventSettingsMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: upsertEventSettingsFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadEventSettingsCacheKey(eventId),
      });
    }),
  });
}
