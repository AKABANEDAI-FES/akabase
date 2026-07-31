/**
 * Create notifications for submission status changes
 * Resolves recipients based on action type and saves notifications
 */

import { generateId } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId, SubmissionActionType, SubmissionId } from "@akabase/domain/project/schema";
import type { NotificationId } from "@akabase/domain/notification/schema";
import type { UserId } from "@akabase/domain/user/schema";
import type { NotificationRepository } from "@akabase/domain/notification/repository";
import {
  createNotificationEntity,
  generateNotificationMessage,
  generateNotificationTitle,
} from "@akabase/domain/notification/logic";
import { Result } from "@akabase/result";

export type CreateNotificationsInput = {
  eventId: EventId;
  projectId: ProjectId;
  submissionId: SubmissionId;
  orgId: OrgId;
  type: SubmissionActionType;
  projectName: string;
  actorUserId: UserId;
};

/**
 * Resolve recipient user IDs based on notification type
 *
 * - submitted / withdrawn: committee admin/approver for the event
 * - approved / returned: organization managers
 *
 * The actor (who triggered the action) is excluded from recipients.
 */
async function resolveRecipients(
  notificationRepo: NotificationRepository,
  input: CreateNotificationsInput,
): Promise<UserId[]> {
  const userIds =
    input.type === "submitted" || input.type === "withdrawn"
      ? await notificationRepo.findCommitteeRecipients(input.eventId)
      : await notificationRepo.findOrgManagerRecipients(input.orgId);

  return userIds.filter((userId) => userId !== input.actorUserId);
}

/**
 * Create and save notifications for a submission status change.
 * This function is designed to be called as a side-effect after
 * the main command completes. Failures do not propagate to the caller.
 */
export async function createNotifications(
  deps: {
    notificationRepo: NotificationRepository;
  },
  input: CreateNotificationsInput,
): Promise<void> {
  try {
    const recipientIds = await resolveRecipients(deps.notificationRepo, input);
    if (recipientIds.length === 0) {
      return;
    }

    const title = generateNotificationTitle(input.type, input.projectName);
    const message = generateNotificationMessage(input.type, input.projectName);

    const notifications = recipientIds
      .map((recipientId) =>
        createNotificationEntity({
          id: generateId<NotificationId>(),
          recipientId,
          eventId: input.eventId,
          type: input.type,
          title,
          message,
          projectId: input.projectId,
          submissionId: input.submissionId,
          orgId: input.orgId,
        }),
      )
      .filter(Result.isSuccess)
      .map((r) => r.value);

    await deps.notificationRepo.saveBatch(notifications);
  } catch {
    // Best-effort notification creation; failures are silently ignored
    // to avoid disrupting the main command flow.
  }
}
