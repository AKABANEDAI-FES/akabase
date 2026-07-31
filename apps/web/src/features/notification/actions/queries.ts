import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listNotifications } from "@akabase/application/query/notification/list-notifications";
import { countUnreadNotifications } from "@akabase/application/query/notification/count-unread";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import { eventIdSchema } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { queryOptions } from "@tanstack/react-query";

/**
 * Server function to load notifications
 */
export const loadNotificationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(
    z.object({
      eventId: eventIdSchema,
      limit: z.number().default(20),
      offset: z.number().default(0),
    }),
  )
  .handler(async ({ data, context }) => {
    return await listNotifications(context.dependencies, cast<UserId>(context.session.user.id), {
      eventId: data.eventId,
      limit: data.limit,
      offset: data.offset,
    });
  });

export function generateLoadNotificationsCacheKey(eventId: string) {
  return ["notifications", "for-event", eventId];
}

export function generateLoadNotificationsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadNotificationsCacheKey(eventId),
    queryFn: async () => loadNotificationsFn({ data: { eventId, limit: 20, offset: 0 } }),
  });
}

/**
 * Server function to count unread notifications
 */
export const loadUnreadCountFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    return await countUnreadNotifications(
      context.dependencies,
      cast<UserId>(context.session.user.id),
      data.eventId,
    );
  });

export function generateLoadUnreadCountCacheKey(eventId: string) {
  return ["notifications", "unread-count", eventId];
}

export function generateLoadUnreadCountQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadUnreadCountCacheKey(eventId),
    queryFn: async () => loadUnreadCountFn({ data: { eventId } }),
  });
}
