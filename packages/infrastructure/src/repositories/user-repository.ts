import type { Database } from "../db";
import { schema } from "../db";
import { and, eq } from "drizzle-orm";
import type { UserRepository } from "@archive/domain/user/repository";
import { committeeRoleAssignmentSchema, userSchema } from "@archive/domain/user/schema";
import type { CommitteeRoleAssignment, User, UserId } from "@archive/domain/user/schema";
import type { EventId } from "@archive/domain/event/schema";
import { REPOSITORY_ERROR_CODE, RepositoryException } from "@archive/domain/shared/repository";

/**
 * User Repository Implementation using Drizzle ORM
 */
export class UserRepositoryImpl implements UserRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findById(userId: UserId): Promise<User | null> {
    try {
      const row = await this.db.query.user.findFirst({
        where: eq(schema.user.id, userId),
      });

      if (!row) {
        return null;
      }

      const user = userSchema.parse({
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified,
        image: row.image ?? null,
        role: row.role,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return user;
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find user",
        error,
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const row = await this.db.query.user.findFirst({
        where: eq(schema.user.email, email),
      });

      if (!row) {
        return null;
      }

      const user = userSchema.parse({
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified,
        image: row.image ?? null,
        role: row.role,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return user;
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find user by email",
        error,
      );
    }
  }

  async listAll(): Promise<User[]> {
    try {
      const rows = await this.db.query.user.findMany({
        orderBy: (user, { desc }) => [desc(user.createdAt)],
      });

      const users: User[] = rows.map((row) =>
        userSchema.parse({
          id: row.id,
          name: row.name,
          email: row.email,
          emailVerified: row.emailVerified,
          image: row.image ?? null,
          role: row.role,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        }),
      );

      return users;
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to list users",
        error,
      );
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      await this.db
        .insert(schema.user)
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
          target: schema.user.id,
          set: {
            // Immutable fields excluded: id, createdAt
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            role: user.role,
            updatedAt: user.updatedAt,
          },
        });
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save user",
        error,
      );
    }
  }

  async findCommitteeRoleAssignment(
    userId: UserId,
    eventId: EventId,
  ): Promise<CommitteeRoleAssignment | null> {
    try {
      const row = await this.db
        .select()
        .from(schema.committeeRoles)
        .where(
          and(eq(schema.committeeRoles.userId, userId), eq(schema.committeeRoles.eventId, eventId)),
        )
        .get();

      if (!row) {
        return null;
      }

      const assignment = committeeRoleAssignmentSchema.parse({
        id: row.id,
        eventId: row.eventId,
        userId: row.userId,
        role: row.role,
        createdAt: new Date(row.createdAt),
      });

      return assignment;
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find committee role assignment",
        error,
      );
    }
  }

  async saveCommitteeRoleAssignment(assignment: CommitteeRoleAssignment): Promise<void> {
    try {
      await this.db
        .insert(schema.committeeRoles)
        .values({
          id: assignment.id,
          userId: assignment.userId,
          eventId: assignment.eventId,
          role: assignment.role,
          createdAt: assignment.createdAt,
        })
        .onConflictDoUpdate({
          target: [schema.committeeRoles.userId, schema.committeeRoles.eventId],
          set: { role: assignment.role },
        });
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save committee role assignment",
        error,
      );
    }
  }
}
