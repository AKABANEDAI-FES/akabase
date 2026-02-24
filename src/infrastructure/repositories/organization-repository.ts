import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { orgMembers, organizations } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { orgMemberSchema, organizationSchema } from "@/domain/organization/schema";
import type { OrgMember, Organization } from "@/domain/organization/schema";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import type { OrganizationRepository } from "@/domain/organization/repository";
import type { RepositoryError } from "@/domain/shared/repository";
import { repositoryError } from "@/domain/shared/repository";

/**
 * Organization Repository Implementation using Drizzle ORM
 */
export class OrganizationRepositoryImpl implements OrganizationRepository {
  async findById(id: OrgId): Promise<Result.Result<Organization | null, RepositoryError>> {
    try {
      const row = await db.query.organizations.findFirst({
        where: (organizations, { eq }) => eq(organizations.id, id),
      });

      if (!row) {
        return Result.succeed(null);
      }

      const organization = organizationSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        description: row.description,
        logoKey: row.logoKey,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return Result.succeed(organization);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to find organization", error));
    }
  }

  async findMembers(orgId: OrgId): Promise<Result.Result<OrgMember[], RepositoryError>> {
    try {
      const rows = await db.query.orgMembers.findMany({
        where: (orgMembers, { eq }) => eq(orgMembers.orgId, orgId),
        orderBy: [desc(orgMembers.createdAt)],
      });

      const members: OrgMember[] = rows.map((row) =>
        orgMemberSchema.parse({
          id: row.id,
          orgId: row.orgId,
          userId: row.userId,
          role: row.role,
          createdAt: new Date(row.createdAt),
        }),
      );

      return Result.succeed(members);
    } catch (error) {
      return Result.fail(
        repositoryError("DATABASE_ERROR", "Failed to find organization members", error),
      );
    }
  }

  async listByEvent(eventId: EventId): Promise<Result.Result<Organization[], RepositoryError>> {
    try {
      const rows = await db.query.organizations.findMany({
        where: (organizations, { eq }) => eq(organizations.eventId, eventId),
        orderBy: [desc(organizations.createdAt)],
      });

      const orgList: Organization[] = rows.map((row) =>
        organizationSchema.parse({
          id: row.id,
          eventId: row.eventId,
          name: row.name,
          description: row.description,
          logoKey: row.logoKey,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        }),
      );

      return Result.succeed(orgList);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to list organizations", error));
    }
  }

  async saveOrganization(org: Organization): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .insert(organizations)
        .values({
          id: org.id,
          eventId: org.eventId,
          name: org.name,
          description: org.description,
          logoKey: org.logoKey,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        })
        .onConflictDoUpdate({
          target: organizations.id,
          set: {
            // Immutable fields excluded: id, eventId, createdAt
            name: org.name,
            description: org.description,
            logoKey: org.logoKey,
            updatedAt: org.updatedAt,
          },
        });

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to save organization", error));
    }
  }

  async deleteOrganization(id: OrgId): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db.delete(organizations).where(eq(organizations.id, id));
      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to delete organization", error));
    }
  }

  async addMember(member: OrgMember): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db.insert(orgMembers).values({
        id: member.id,
        orgId: member.orgId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
      });

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to add member", error));
    }
  }

  async removeMember(orgId: OrgId, userId: UserId): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .delete(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to remove member", error));
    }
  }

  async updateMemberRole(
    orgId: OrgId,
    userId: UserId,
    role: "manager" | "editor",
  ): Promise<Result.Result<void, RepositoryError>> {
    try {
      await db
        .update(orgMembers)
        .set({ role })
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));

      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(repositoryError("DATABASE_ERROR", "Failed to update member role", error));
    }
  }
}
