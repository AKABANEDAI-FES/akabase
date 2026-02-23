import { createServerFn } from "@tanstack/react-start";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createOrganization } from "@/application/command/organization/create-organization";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { organizationSchema } from "@/domain/organization/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadOrganizationsCacheKey } from "./queries";

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
    onSuccess: (result, variables) => {
      Result.inspect(() => {
        queryClient.invalidateQueries({
          queryKey: generateLoadOrganizationsCacheKey(variables.data.eventId),
        });
      })(result);
    },
  });
}
