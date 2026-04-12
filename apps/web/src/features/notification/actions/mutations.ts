import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { markNotificationAsRead } from "@akabase/application/command/notification/mark-as-read";
import { markAllNotificationsAsRead } from "@akabase/application/command/notification/mark-all-as-read";
import { authMiddleware } from "@/libs/auth";
import { dependenciesMiddleware } from "@/libs/dependencies";
import { cast } from "@akabase/domain/shared/ids";
import { notificationIdSchema } from "@akabase/domain/notification/schema";
import { eventIdSchema } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { generateLoadNotificationsCacheKey, generateLoadUnreadCountCacheKey } from "./queries";

/**
 * Server function to mark a notification as read
 */
export const markAsReadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(
    z.object({
      notificationId: notificationIdSchema,
      eventId: eventIdSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    await markNotificationAsRead(
      context.dependencies,
      data.notificationId,
      cast<UserId>(context.session.user.id),
    );
    return { eventId: data.eventId };
  });

export function useMarkAsReadMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: markAsReadFn,
    onSuccess: async ({ eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadNotificationsCacheKey(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadUnreadCountCacheKey(eventId),
        }),
      ]);
    },
  });
}

/**
 * Server function to mark all notifications as read
 */
export const markAllAsReadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, dependenciesMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data, context }) => {
    await markAllNotificationsAsRead(
      context.dependencies,
      cast<UserId>(context.session.user.id),
      data.eventId,
    );
    return { eventId: data.eventId };
  });

export function useMarkAllAsReadMutationOption() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: markAllAsReadFn,
    onSuccess: async ({ eventId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: generateLoadNotificationsCacheKey(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: generateLoadUnreadCountCacheKey(eventId),
        }),
      ]);
    },
  });
}
