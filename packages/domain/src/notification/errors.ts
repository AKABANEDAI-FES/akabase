import type { BaseError, DomainErrorCodeOf } from "../shared/errors";
import { createError } from "../shared/errors";

// 現時点で通知固有のエラーコードは不要 (共通の VALIDATION_ERROR のみ使用)
export const NOTIFICATION_ERROR_CODE = {} as const;

export type NotificationErrorCode = DomainErrorCodeOf<typeof NOTIFICATION_ERROR_CODE>;

export type NotificationError = BaseError<NotificationErrorCode>;

export function notificationError(code: NotificationErrorCode, message: string): NotificationError {
  return createError(code, message);
}
