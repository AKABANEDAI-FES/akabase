import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { authMiddleware } from "@/libs/session-server";
import { listUsersWithRoles } from "@/application/query/user/list-users-with-roles";
import { listUsersForEvent } from "@/application/query/user/list-users-for-event";
import { eventIdSchema } from "@/domain/shared/ids";
import { queryOptions } from "@tanstack/react-query";

export const loadUsersWithRolesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const result = await listUsersWithRoles();

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
  .handler(async ({ data }) => {
    const result = await listUsersForEvent(data.eventId);

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
