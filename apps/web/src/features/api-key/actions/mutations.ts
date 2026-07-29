import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@akabase/result";
import { createApiKey } from "@akabase/application/command/api-key/create-api-key";
import { deleteApiKey } from "@akabase/application/command/api-key/delete-api-key";
import { resolveActor } from "@akabase/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import { apiKeyIdSchema, apiKeyNameSchema } from "@akabase/domain/api-key/schema";
import { eventIdSchema } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadApiKeysCacheKey } from "./queries";

export const createApiKeyInputSchema = z.object({
  name: apiKeyNameSchema,
  eventId: eventIdSchema,
});

export const createApiKeyFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(createApiKeyInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
      });

      return yield* $(
        await createApiKey(context.dependencies, {
          name: data.name,
          eventId: data.eventId,
          actor,
        }),
      );
    });
  });

export function useCreateApiKeyMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createApiKeyFn,
    onSuccess: Result.inspect(async () => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadApiKeysCacheKey(),
      });
    }),
  });
}

export const deleteApiKeyInputSchema = z.object({
  apiKeyId: apiKeyIdSchema,
});

export const deleteApiKeyFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(deleteApiKeyInputSchema)
  .handler(async ({ data, context }) => {
    return await Result.gen(async function* ($) {
      const actor = await resolveActor(context.dependencies, {
        userId: cast<UserId>(context.session.user.id),
      });

      return yield* $(
        await deleteApiKey(context.dependencies, {
          apiKeyId: data.apiKeyId,
          actor,
        }),
      );
    });
  });

export function useDeleteApiKeyMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: deleteApiKeyFn,
    onSuccess: Result.inspect(async () => {
      await queryClient.invalidateQueries({
        queryKey: generateLoadApiKeysCacheKey(),
      });
    }),
  });
}
