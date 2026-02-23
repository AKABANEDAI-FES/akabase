/**
 * User repository implementation
 * Handles user data persistence using Drizzle ORM
 */

import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { committeeRoles, user as userTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { generateId } from "@/libs/id";
import type { UserRepository } from "@/domain/user/repository";
import type { User } from "@/domain/user/schema";
import type { EventId, UserId } from "@/domain/shared/ids";
import type { CommitteeRole, GlobalRole } from "@/domain/authorization/schema";
import type { RepositoryError } from "@/domain/shared/repository";
import { cast } from "@/domain/shared/ids";

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

  async upsertCommitteeRole(
    userId: UserId,
    eventId: EventId,
    role: CommitteeRole,
  ): Promise<Result.Result<void, RepositoryError>> {
    try {
      // Check if a role assignment already exists
      const existing = await db
        .select()
        .from(committeeRoles)
        .where(and(eq(committeeRoles.userId, userId), eq(committeeRoles.eventId, eventId)))
        .get();

      if (existing) {
        // Update existing role
        await db
          .update(committeeRoles)
          .set({ role })
          .where(eq(committeeRoles.id, existing.id))
          .run();
      } else {
        // Create new role assignment
        await db
          .insert(committeeRoles)
          .values({
            id: generateId(),
            userId,
            eventId,
            role,
          })
          .run();
      }

      return Result.succeed(undefined);
    } catch (error) {
      console.error("[UserRepository] upsertCommitteeRole error:", error);
      return Result.fail({
        code: "DATABASE_ERROR",
        message: "委員会ロールの更新に失敗しました",
      });
    }
  }

  async updateGlobalRole(
    userId: UserId,
    role: GlobalRole,
  ): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db.update(userTable).set({ role }).where(eq(userTable.id, userId)).run();

      return Result.succeed(undefined);
    } catch (error) {
      console.error("[UserRepository] updateGlobalRole error:", error);
      return Result.fail({
        code: "DATABASE_ERROR",
        message: "グローバルロールの更新に失敗しました",
      });
    }
  }
}
