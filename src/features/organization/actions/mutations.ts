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
    // Resolve actor with event context
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    if (Result.isFailure(actorResult)) {
      return actorResult;
    }

    const result = await createOrganization(dependencies, {
      eventId: data.eventId,
      name: data.name,
      description: data.description,
      logoKey: data.logoKey,
      actor: actorResult.value,
    });

    return result;
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
    // Resolve actor with event context
    // Note: We need to fetch the org first to get eventId for actor resolution
    const orgResult = await dependencies.organizationRepo.findById(data.id);

    if (Result.isFailure(orgResult) || !orgResult.value) {
      return Result.fail({
        code: "ORGANIZATION_NOT_FOUND" as const,
        message: "団体が見つかりません。",
      });
    }

    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [orgResult.value.eventId],
    });

    if (Result.isFailure(actorResult)) {
      return actorResult;
    }

    const result = await updateOrganization(dependencies, {
      orgId: data.id,
      name: data.name,
      description: data.description,
      actor: actorResult.value,
    });

    return result;
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
