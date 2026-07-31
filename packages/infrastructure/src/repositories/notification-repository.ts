import type { Database } from "../db";
import { schema } from "../db";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { userIdSchema } from "@akabase/domain/user/schema";
import type { Notification, NotificationId } from "@akabase/domain/notification/schema";
import { notificationSchema } from "@akabase/domain/notification/schema";
import type { NotificationRepository } from "@akabase/domain/notification/repository";
import { REPOSITORY_ERROR_CODE, RepositoryExceptionError } from "@akabase/domain/shared/repository";

/**
 * Notification Repository Implementation using Drizzle ORM
 */
export class NotificationRepositoryImpl implements NotificationRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async saveBatch(notifications: Notification[]): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    try {
      await this.db.insert(schema.notifications).values(
        notifications.map((n) => ({
          id: n.id,
          recipientId: n.recipientId,
          eventId: n.eventId,
          type: n.type,
          title: n.title,
          message: n.message,
          projectId: n.projectId,
          submissionId: n.submissionId,
          orgId: n.orgId,
          readAt: n.readAt,
          createdAt: n.createdAt,
        })),
      );
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save notifications",
        error,
      );
    }
  }

  async findByRecipient(
    recipientId: UserId,
    options: { eventId?: EventId; limit: number; offset: number },
  ): Promise<Notification[]> {
    try {
      const conditions = [eq(schema.notifications.recipientId, recipientId)];
      if (options.eventId) {
        conditions.push(eq(schema.notifications.eventId, options.eventId));
      }

      const rows = await this.db
        .select()
        .from(schema.notifications)
        .where(and(...conditions))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(options.limit)
        .offset(options.offset);

      return rows.map((row) =>
        notificationSchema.parse({
          id: row.id,
          recipientId: row.recipientId,
          eventId: row.eventId,
          type: row.type,
          title: row.title,
          message: row.message,
          projectId: row.projectId,
          submissionId: row.submissionId,
          orgId: row.orgId,
          readAt: row.readAt ? new Date(row.readAt) : null,
          createdAt: new Date(row.createdAt),
        }),
      );
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find notifications",
        error,
      );
    }
  }

  async countUnread(recipientId: UserId, eventId?: EventId): Promise<number> {
    try {
      const conditions = [
        eq(schema.notifications.recipientId, recipientId),
        isNull(schema.notifications.readAt),
      ];
      if (eventId) {
        conditions.push(eq(schema.notifications.eventId, eventId));
      }

      const [result] = await this.db
        .select({ count: count() })
        .from(schema.notifications)
        .where(and(...conditions));

      return result?.count ?? 0;
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to count unread notifications",
        error,
      );
    }
  }

  async markAsRead(id: NotificationId, recipientId: UserId, now?: Date): Promise<void> {
    try {
      await this.db
        .update(schema.notifications)
        .set({ readAt: now ?? new Date() })
        .where(
          and(eq(schema.notifications.id, id), eq(schema.notifications.recipientId, recipientId)),
        );
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to mark notification as read",
        error,
      );
    }
  }

  async markAllAsRead(recipientId: UserId, eventId?: EventId, now?: Date): Promise<void> {
    try {
      const conditions = [
        eq(schema.notifications.recipientId, recipientId),
        isNull(schema.notifications.readAt),
      ];
      if (eventId) {
        conditions.push(eq(schema.notifications.eventId, eventId));
      }

      await this.db
        .update(schema.notifications)
        .set({ readAt: now ?? new Date() })
        .where(and(...conditions));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to mark all notifications as read",
        error,
      );
    }
  }

  async findCommitteeRecipients(eventId: EventId): Promise<UserId[]> {
    try {
      const rows = await this.db
        .select({ userId: schema.committeeRoles.userId })
        .from(schema.committeeRoles)
        .where(
          and(
            eq(schema.committeeRoles.eventId, eventId),
            inArray(schema.committeeRoles.role, ["admin", "approver"]),
          ),
        );
      return rows.map((r) => userIdSchema.parse(r.userId));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find committee recipients",
        error,
      );
    }
  }

  async findOrgManagerRecipients(orgId: OrgId): Promise<UserId[]> {
    try {
      const rows = await this.db
        .select({ userId: schema.orgMembers.userId })
        .from(schema.orgMembers)
        .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.role, "manager")));
      return rows.map((r) => userIdSchema.parse(r.userId));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find org manager recipients",
        error,
      );
    }
  }
}
