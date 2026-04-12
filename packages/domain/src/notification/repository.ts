import type { EventId } from "../event/schema";
import type { OrgId } from "../organization/schema";
import type { UserId } from "../user/schema";
import type { Notification, NotificationId } from "./schema";

/**
 * =============================================================================
 * Notification Repository
 * =============================================================================
 * Repository methods throw RepositoryExceptionError on infrastructure failures.
 * Returns null for "not found" scenarios (valid state, not an error).
 */

export type NotificationRepository = {
  /**
   * Save multiple notifications at once
   * @throws {RepositoryExceptionError} on database errors
   */
  saveBatch(notifications: Notification[]): Promise<void>;

  /**
   * Find notifications for a recipient
   * @throws {RepositoryExceptionError} on database errors
   */
  findByRecipient(
    recipientId: UserId,
    options: { eventId?: EventId; limit: number; offset: number },
  ): Promise<Notification[]>;

  /**
   * Count unread notifications for a recipient
   * @throws {RepositoryExceptionError} on database errors
   */
  countUnread(recipientId: UserId, eventId?: EventId): Promise<number>;

  /**
   * Mark a single notification as read
   * @throws {RepositoryExceptionError} on database errors
   */
  markAsRead(id: NotificationId, recipientId: UserId, now?: Date): Promise<void>;

  /**
   * Mark all notifications as read for a recipient
   * @throws {RepositoryExceptionError} on database errors
   */
  markAllAsRead(recipientId: UserId, eventId?: EventId, now?: Date): Promise<void>;

  /**
   * Find committee admin/approver user IDs for an event
   * Used for notification recipient resolution
   * @throws {RepositoryExceptionError} on database errors
   */
  findCommitteeRecipients(eventId: EventId): Promise<UserId[]>;

  /**
   * Find organization manager user IDs
   * Used for notification recipient resolution
   * @throws {RepositoryExceptionError} on database errors
   */
  findOrgManagerRecipients(orgId: OrgId): Promise<UserId[]>;
};
