import { createServerFn } from "@tanstack/react-start";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createOrganization } from "@/application/command/organization/create-organization";
import { updateOrganization } from "@/application/command/organization/update-organization";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { organizationSchema } from "@/domain/organization/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateLoadOrganizationDetailCacheKey,
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
      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [data.eventId],
        }),
      );

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
    }),
  });
}

/**
 * Update organization input validation schema
 */
export const updateOrganizationInputSchema = organizationSchema.pick({
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
      // Resolve actor with event context
      // Note: We need to fetch the org first to get eventId for actor resolution
      const org = yield* $(await dependencies.organizationRepo.findById(data.id));

      if (!org) {
        return yield* $(
          Result.fail({
            code: "ORGANIZATION_NOT_FOUND" as const,
            message: "団体が見つかりません。",
          }),
        );
      }

      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [org.eventId],
        }),
      );

      return yield* $(
        await updateOrganization(dependencies, {
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
        queryKey: generateLoadOrganizationDetailCacheKey(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: generateLoadOrganizationsCacheKey(eventId),
      });
    }),
  });
}
