import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/libs/session-server";
import { listUsersWithRoles } from "@/application/query/user/list-users-with-roles";
import { listUsersForEvent } from "@/application/query/user/list-users-for-event";
import { cast, eventIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";
import { resolveActor } from "@/application/query/authorization/resolve-actor";
import { dependencies } from "@/infrastructure/di";

export const loadUsersWithRolesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // Resolve actor from session
    const actor = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
    });

    // Query with authorization check
    return await listUsersWithRoles(dependencies, actor);
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
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    return await listUsersForEvent(dependencies, data.eventId, actor);
  });

export function generateLoadUsersForEventCacheKey(eventId: string) {
  return ["users", "for-event", eventId];
}

export function generateLoadUsersForEventQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadUsersForEventCacheKey(eventId),
    queryFn: () => loadUsersForEventFn({ data: { eventId } }),
  });
}
