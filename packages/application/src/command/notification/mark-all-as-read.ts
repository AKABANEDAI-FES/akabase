/**
 * Mark all notifications as read for a recipient
 */

import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import type { NotificationRepository } from "@akabase/domain/notification/repository";

export async function markAllNotificationsAsRead(
  deps: { notificationRepo: NotificationRepository },
  recipientId: UserId,
  eventId?: EventId,
): Promise<void> {
  await deps.notificationRepo.markAllAsRead(recipientId, eventId);
}
