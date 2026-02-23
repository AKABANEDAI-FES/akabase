/**
 * User repository implementation
 * Handles user data persistence using Drizzle ORM
 */

import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { committeeRoles, user as userTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { UserRepository } from "@/domain/user/repository";
import type { CommitteeRoleAssignment, User } from "@/domain/user/schema";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { RepositoryError } from "@/domain/shared/repository";
import { cast } from "@/domain/shared/ids";
import type { CommitteeRole } from "@/domain/authorization/schema";

export class UserRepositoryImpl implements UserRepository {
  async findById(userId: UserId): Promise<Result.Result<User | null, RepositoryError>> {
    try {
      const row = await db.query.user.findFirst({
        where: eq(userTable.id, userId),
      });

      if (!row) {
        return Result.succeed(null);
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

      return Result.succeed(user);
    } catch (error) {
      console.error("[UserRepository] findById error:", error);
      return Result.fail({
        code: "DATABASE_ERROR",
        message: "ユーザーの取得に失敗しました",
      });
    }
  }

  async listAll(): Promise<Result.Result<User[], RepositoryError>> {
    try {
      const rows = await db.query.user.findMany({
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

      return Result.succeed(users);
    } catch (error) {
      console.error("[UserRepository] listAll error:", error);
      return Result.fail({
        code: "DATABASE_ERROR",
        message: "ユーザー一覧の取得に失敗しました",
      });
    }
  }

  async saveUser(user: User): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
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

      return Result.succeed(undefined);
    } catch (error) {
      console.error("[UserRepository] saveUser error:", error);
      return Result.fail({
        code: "DATABASE_ERROR",
        message: "ユーザーの保存に失敗しました",
      });
    }
  }

  async findCommitteeRoleAssignment(
    userId: UserId,
    eventId: EventId,
  ): Promise<Result.Result<CommitteeRoleAssignment | null, RepositoryError>> {
    try {
      const row = await db
        .select()
        .from(committeeRoles)
        .where(and(eq(committeeRoles.userId, userId), eq(committeeRoles.eventId, eventId)))
        .get();

      if (!row) {
        return Result.succeed(null);
      }

      const assignment: CommitteeRoleAssignment = {
        id: row.id,
        eventId: cast<EventId>(row.eventId),
        userId: cast<UserId>(row.userId),
        role: row.role as CommitteeRole,
        createdAt: new Date(row.createdAt),
      };

      return Result.succeed(assignment);
    } catch (error) {
      console.error("[UserRepository] findCommitteeRoleAssignment error:", error);
      return Result.fail({
        code: "DATABASE_ERROR",
        message: "委員会ロール割り当ての取得に失敗しました",
      });
    }
  }

  async saveCommitteeRoleAssignment(
    assignment: CommitteeRoleAssignment,
  ): Promise<Result.Result<void, RepositoryError>> {
    try {
      // UPSERT using onConflictDoUpdate
      await db
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

      return Result.succeed(undefined);
    } catch (error) {
      console.error("[UserRepository] saveCommitteeRoleAssignment error:", error);
      return Result.fail({
        code: "DATABASE_ERROR",
        message: "委員会ロール割り当ての保存に失敗しました",
      });
    }
  }
}
