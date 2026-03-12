import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { listUsersWithRoles } from "@archive/application/query/user/list-users-with-roles";
import { listUsersForEvent } from "@archive/application/query/user/list-users-for-event";
import { cast } from "@archive/domain/shared/ids";
import { eventIdSchema } from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";
import { queryOptions } from "@tanstack/react-query";
import { resolveActor } from "@archive/application/query/authorization/resolve-actor";

export const loadUsersWithRolesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .handler(async ({ context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
    });

    return await listUsersWithRoles(context.dependencies, actor);
  });

export function generateLoadUsersWithRolesCacheKey() {
  return ["users", "with-roles"];
}

export function generateLoadUsersWithRolesQueryOptions() {
  return queryOptions({
    queryKey: generateLoadUsersWithRolesCacheKey(),
    queryFn: loadUsersWithRolesFn,
  });
}

export const loadUsersForEventFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context.dependencies, {
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listUsersForEvent(context.dependencies, data.eventId, actor);
  });

export function generateLoadUsersForEventCacheKey(eventId: string) {
  return ["users", "for-event", eventId];
}

export function generateLoadUsersForEventQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadUsersForEventCacheKey(eventId),
    queryFn: async () => loadUsersForEventFn({ data: { eventId } }),
  });
}
