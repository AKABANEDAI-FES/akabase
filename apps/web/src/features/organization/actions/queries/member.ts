import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listOrganizationMembers } from "@akabase/application/query/organization/list-organization-members";
import { resolveActor } from "@akabase/application/query/authorization/resolve-actor";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import { eventIdSchema } from "@akabase/domain/event/schema";
import { orgIdSchema } from "@akabase/domain/organization/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to load organization members
 */
export const loadOrganizationMembersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema, orgId: orgIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listOrganizationMembers(context.dependencies, data.eventId, data.orgId, actor);
  });

export function generateLoadOrganizationMembersCacheKey(eventId: string, orgId: string) {
  return ["organizations", [eventId, orgId], "members"];
}

export function generateLoadOrganizationMembersQueryOptions(eventId: string, orgId: string) {
  return queryOptions({
    queryKey: generateLoadOrganizationMembersCacheKey(eventId, orgId),
    queryFn: async () => loadOrganizationMembersFn({ data: { eventId, orgId } }),
  });
}
