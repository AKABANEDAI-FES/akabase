import { z } from "zod";
import { eventIdSchema } from "../event/schema";
import { orgIdSchema } from "../organization/schema";
import { projectIdSchema, submissionActionTypeSchema, submissionIdSchema } from "../project/schema";
import { userIdSchema } from "../user/schema";

export const notificationIdSchema = z.string().brand<"NotificationId">();
export type NotificationId = z.infer<typeof notificationIdSchema>;

/**
 * Notification (通知)
 * ステータス変更時にユーザーへ送られる通知
 */
export const notificationSchema = z.object({
  id: notificationIdSchema,
  recipientId: userIdSchema,
  eventId: eventIdSchema,
  type: submissionActionTypeSchema,
  title: z.string().min(1, "タイトルを入力してください"),
  message: z.string().min(1, "メッセージを入力してください"),
  projectId: projectIdSchema.nullable(),
  submissionId: submissionIdSchema.nullable(),
  orgId: orgIdSchema.nullable(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
});

export type Notification = z.infer<typeof notificationSchema>;
