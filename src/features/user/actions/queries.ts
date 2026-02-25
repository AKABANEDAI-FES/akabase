import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { authMiddleware } from "@/libs/session-server";
import { listUsersWithRoles } from "@/application/query/user/list-users-with-roles";
import { listUsersForEvent } from "@/application/query/user/list-users-for-event";
import { cast, eventIdSchema } from "@/domain/shared/ids";
import type { UserId } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";
import { resolveActor } from "@/application/query/authorization/resolve-actor";

export const loadUsersWithRolesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // Resolve actor from session
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    // Query with authorization check
    const result = await listUsersWithRoles(actorResult.value);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
    const actorResult = await resolveActor({
      userId: cast<UserId>(context.session.user.id),
      eventIds: [data.eventId],
    });

    if (Result.isFailure(actorResult)) {
      throw new Error(actorResult.error.message);
    }

    const result = await listUsersForEvent(data.eventId, actorResult.value);

    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }

    return result.value;
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
