import { db } from "@/db";
import { orgMembers, organizations } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { orgMemberSchema, organizationSchema } from "@/domain/organization/schema";
import type { OrgMember, Organization } from "@/domain/organization/schema";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import type { OrganizationRepository } from "@/domain/organization/repository";
import { RepositoryException } from "@/domain/shared/repository";

/**
 * Organization Repository Implementation using Drizzle ORM
 */
export class OrganizationRepositoryImpl implements OrganizationRepository {
  async findById(eventId: EventId, id: OrgId): Promise<Organization | null> {
    try {
      const row = await db.query.organizations.findFirst({
        where: (organizations, { eq, and }) =>
          and(eq(organizations.id, id), eq(organizations.eventId, eventId)),
      });

      if (!row) {
        return null;
      }

      const organization = organizationSchema.parse({
        id: row.id,
        eventId: row.eventId,
        name: row.name,
        description: row.description,
        logoImageId: row.logoImageId,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });

      return organization;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find organization", error);
    }
  }

  async findMembers(orgId: OrgId): Promise<OrgMember[]> {
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

      return members;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to find organization members", error);
    }
  }

  async listByEvent(eventId: EventId): Promise<Organization[]> {
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
          logoImageId: row.logoImageId,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        }),
      );

      return orgList;
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to list organizations", error);
    }
  }

  async saveOrganization(org: Organization): Promise<void> {
    try {
      await db
        .insert(organizations)
        .values({
          id: org.id,
          eventId: org.eventId,
          name: org.name,
          description: org.description,
          logoImageId: org.logoImageId,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        })
        .onConflictDoUpdate({
          target: organizations.id,
          set: {
            // Immutable fields excluded: id, eventId, createdAt
            name: org.name,
            description: org.description,
            logoImageId: org.logoImageId,
            updatedAt: org.updatedAt,
          },
          where: eq(organizations.eventId, org.eventId),
        });
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save organization", error);
    }
  }

  async deleteOrganization(eventId: EventId, id: OrgId): Promise<void> {
    try {
      await db
        .delete(organizations)
        .where(and(eq(organizations.id, id), eq(organizations.eventId, eventId)));
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to delete organization", error);
    }
  }

  async saveMember(member: OrgMember): Promise<void> {
    try {
      await db
        .insert(orgMembers)
        .values({
          id: member.id,
          orgId: member.orgId,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt,
        })
        .onConflictDoUpdate({
          target: orgMembers.id,
          set: {
            // Immutable fields excluded: id, orgId, userId, createdAt
            role: member.role,
          },
        });
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to save member", error);
    }
  }

  async removeMember(orgId: OrgId, userId: UserId): Promise<void> {
    try {
      await db
        .delete(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
    } catch (error) {
      throw new RepositoryException("DATABASE_ERROR", "Failed to remove member", error);
    }
  }
}
