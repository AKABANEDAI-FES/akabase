import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import type { NotificationRepository } from "@akabase/domain/notification/repository";
import { QueryExceptionError } from "../shared";

export async function countUnreadNotifications(
  deps: { notificationRepo: NotificationRepository },
  recipientId: UserId,
  eventId?: EventId,
): Promise<number> {
  try {
    return await deps.notificationRepo.countUnread(recipientId, eventId);
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "未読通知数の取得に失敗しました。", error);
  }
}
