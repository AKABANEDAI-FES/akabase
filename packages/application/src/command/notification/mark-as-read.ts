/**
 * Mark a single notification as read
 */

import type { UserId } from "@akabase/domain/user/schema";
import type { NotificationId } from "@akabase/domain/notification/schema";
import type { NotificationRepository } from "@akabase/domain/notification/repository";

export async function markNotificationAsRead(
  deps: { notificationRepo: NotificationRepository },
  notificationId: NotificationId,
  recipientId: UserId,
): Promise<void> {
  await deps.notificationRepo.markAsRead(notificationId, recipientId);
}
