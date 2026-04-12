import { Result } from "@akabase/result";
import type { Notification, NotificationId } from "./schema";
import { notificationSchema } from "./schema";
import type { NotificationError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";
import { notificationError } from "./errors";
import type { EventId } from "../event/schema";
import type { OrgId } from "../organization/schema";
import type { ProjectId, SubmissionActionType, SubmissionId } from "../project/schema";
import type { UserId } from "../user/schema";

/**
 * Generate notification title based on type and project name
 */
export function generateNotificationTitle(type: SubmissionActionType, projectName: string): string {
  switch (type) {
    case "submitted": {
      return `${projectName} が提出されました`;
    }
    case "approved": {
      return `${projectName} が承認されました`;
    }
    case "returned": {
      return `${projectName} が差し戻されました`;
    }
    case "withdrawn": {
      return `${projectName} が取り下げられました`;
    }
    default: {
      return type satisfies never;
    }
  }
}

/**
 * Generate notification message based on type
 */
export function generateNotificationMessage(
  type: SubmissionActionType,
  projectName: string,
): string {
  switch (type) {
    case "submitted": {
      return `「${projectName}」が提出されました。確認・承認をお願いします。`;
    }
    case "approved": {
      return `「${projectName}」が承認され、公開データが作成されました。`;
    }
    case "returned": {
      return `「${projectName}」が差し戻されました。内容を修正して再提出してください。`;
    }
    case "withdrawn": {
      return `「${projectName}」の提出が取り下げられました。`;
    }
    default: {
      return type satisfies never;
    }
  }
}

/**
 * Create a new Notification entity
 * Validates input using zod schema
 */
export function createNotificationEntity(input: {
  id: NotificationId;
  recipientId: UserId;
  eventId: EventId;
  type: SubmissionActionType;
  title: string;
  message: string;
  projectId: ProjectId | null;
  submissionId: SubmissionId | null;
  orgId: OrgId | null;
  now?: Date;
}): Result.Result<Notification, NotificationError> {
  const now = input.now ?? new Date();
  const data = {
    id: input.id,
    recipientId: input.recipientId,
    eventId: input.eventId,
    type: input.type,
    title: input.title,
    message: input.message,
    projectId: input.projectId,
    submissionId: input.submissionId,
    orgId: input.orgId,
    readAt: null,
    createdAt: now,
  };

  return Result.try({
    try: () => notificationSchema.parse(data),
    catch: () => notificationError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "通知の作成に失敗しました"),
  });
}
