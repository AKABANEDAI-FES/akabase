import { createServerFn } from "@tanstack/react-start";
import { Result } from "@praha/byethrow";
import { dependencies } from "@/infrastructure/di";
import { createProject } from "@/application/command/project/create-project";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/session-server";
import { cast } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { projectSchema } from "@/domain/project/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateLoadProjectsCacheKey } from "./queries";

/**
 * Create project input validation schema
 */
export const createProjectInputSchema = projectSchema.pick({
  eventId: true,
  orgId: true,
  name: true,
  placeText: true,
  logoKey: true,
});

/**
 * Server function to create project
 */
export const createProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createProjectInputSchema)
  .handler(async ({ data, context }) => {
    // Resolve actor with event context
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    if (Result.isFailure(actorResult)) {
      return actorResult;
    }

    const result = await createProject(dependencies, {
      eventId: data.eventId,
      orgId: data.orgId,
      name: data.name,
      placeText: data.placeText,
      logoKey: data.logoKey,
      actor: actorResult.value,
    });

    return result;
  });

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProjectFn,
    onSuccess: Result.inspect(({ orgId }) => {
      queryClient.invalidateQueries({
        queryKey: generateLoadProjectsCacheKey(orgId),
      });
    }),
  });
}
