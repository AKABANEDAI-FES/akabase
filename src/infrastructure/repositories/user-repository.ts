/**
 * User repository implementation
 * Handles user data persistence using Drizzle ORM
 */

import type { Database } from "@/db";
import { committeeRoles, user as userTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { UserRepository } from "@/domain/user/repository";
import type { CommitteeRoleAssignment, User } from "@/domain/user/schema";
import type { EventId, UserId } from "@/domain/shared/ids";
import { RepositoryException } from "@/domain/shared/repository";
import { cast } from "@/domain/shared/ids";
import type { CommitteeRole } from "@/domain/authorization/schema";

export class UserRepositoryImpl implements UserRepository {
  constructor(private db: Database) {}

  async findById(userId: UserId): Promise<User | null> {
    try {
      const row = await this.db.query.user.findFirst({
        where: eq(userTable.id, userId),
      });

      if (!row) {
        return null;
      }

      const user: User = {
        id: cast<UserId>(row.id),
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified ?? false,
        image: row.image ?? null,
        role: (row.role as "admin" | "user") ?? null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };

      return user;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "ユーザーの取得に失敗しました", error);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const row = await this.db.query.user.findFirst({
        where: eq(userTable.email, email),
      });

      if (!row) {
        return null;
      }

      const user: User = {
        id: cast<UserId>(row.id),
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified ?? false,
        image: row.image ?? null,
        role: (row.role as "admin" | "user") ?? null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };

      return user;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "ユーザーの取得に失敗しました", error);
    }
  }

  async listAll(): Promise<User[]> {
    try {
      const rows = await this.db.query.user.findMany({
        orderBy: (user, { desc }) => [desc(user.createdAt)],
      });

      const users: User[] = rows.map((row) => ({
        id: cast<UserId>(row.id),
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified ?? false,
        image: row.image ?? null,
        role: (row.role as "admin" | "user") ?? null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }));

      return users;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "ユーザー一覧の取得に失敗しました", error);
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      await this.db
        .insert(userTable)
        .values({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .onConflictDoUpdate({
          target: userTable.id,
          set: {
            // Immutable fields excluded: id, createdAt
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            role: user.role,
            updatedAt: user.updatedAt,
          },
        })
        .run();
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "ユーザーの保存に失敗しました", error);
    }
  }

  async findCommitteeRoleAssignment(
    userId: UserId,
    eventId: EventId,
  ): Promise<CommitteeRoleAssignment | null> {
    try {
      const row = await this.db
        .select()
        .from(committeeRoles)
        .where(and(eq(committeeRoles.userId, userId), eq(committeeRoles.eventId, eventId)))
        .get();

      if (!row) {
        return null;
      }

      const assignment: CommitteeRoleAssignment = {
        id: row.id,
        eventId: cast<EventId>(row.eventId),
        userId: cast<UserId>(row.userId),
        role: row.role as CommitteeRole,
        createdAt: new Date(row.createdAt),
      };

      return assignment;
    } catch (error) {
      throw new RepositoryException(
        "DATABASE_ERROR",
        "委員会ロール割り当ての取得に失敗しました",
        error,
      );
    }
  }

  async saveCommitteeRoleAssignment(assignment: CommitteeRoleAssignment): Promise<void> {
    try {
      // UPSERT using onConflictDoUpdate
      await this.db
        .insert(committeeRoles)
        .values({
          id: assignment.id,
          userId: assignment.userId,
          eventId: assignment.eventId,
          role: assignment.role,
          createdAt: assignment.createdAt,
        })
        .onConflictDoUpdate({
          target: [committeeRoles.userId, committeeRoles.eventId],
          set: { role: assignment.role },
        })
        .run();
    } catch (error) {
      throw new RepositoryException(
        "DATABASE_ERROR",
        "委員会ロール割り当ての保存に失敗しました",
        error,
      );
    }
  }
}
