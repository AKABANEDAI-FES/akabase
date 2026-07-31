import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import type { NotificationRepository } from "@akabase/domain/notification/repository";
import type { Notification } from "@akabase/domain/notification/schema";
import { QueryExceptionError } from "../shared";

export type NotificationListItem = Notification;

export async function listNotifications(
  deps: { notificationRepo: NotificationRepository },
  recipientId: UserId,
  options: { eventId?: EventId; limit: number; offset: number },
): Promise<NotificationListItem[]> {
  try {
    return await deps.notificationRepo.findByRecipient(recipientId, options);
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "通知の取得に失敗しました。", error);
  }
}
