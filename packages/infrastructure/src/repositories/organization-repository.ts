import type { Database } from "../db";
import { schema } from "../db";
import { and, desc, eq } from "drizzle-orm";
import { orgMemberSchema, organizationSchema } from "@akabase/domain/organization/schema";
import type { OrgId, OrgMember, Organization } from "@akabase/domain/organization/schema";
import type { OrganizationRepository } from "@akabase/domain/organization/repository";
import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { REPOSITORY_ERROR_CODE, RepositoryExceptionError } from "@akabase/domain/shared/repository";

/**
 * Organization Repository Implementation using Drizzle ORM
 */
export class OrganizationRepositoryImpl implements OrganizationRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findById(eventId: EventId, id: OrgId): Promise<Organization | null> {
    try {
      const row = await this.db.query.organizations.findFirst({
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
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find organization",
        error,
      );
    }
  }

  async findMembers(orgId: OrgId): Promise<OrgMember[]> {
    try {
      const rows = await this.db.query.orgMembers.findMany({
        where: (orgMembers, { eq }) => eq(orgMembers.orgId, orgId),
        orderBy: [desc(schema.orgMembers.createdAt)],
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
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to find organization members",
        error,
      );
    }
  }

  async listByEvent(eventId: EventId): Promise<Organization[]> {
    try {
      const rows = await this.db.query.organizations.findMany({
        where: (organizations, { eq }) => eq(organizations.eventId, eventId),
        orderBy: [desc(schema.organizations.createdAt)],
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
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to list organizations",
        error,
      );
    }
  }

  async saveOrganization(org: Organization): Promise<void> {
    try {
      await this.db
        .insert(schema.organizations)
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
          target: schema.organizations.id,
          set: {
            // Immutable fields excluded: id, eventId, createdAt
            name: org.name,
            description: org.description,
            logoImageId: org.logoImageId,
            updatedAt: org.updatedAt,
          },
          where: eq(schema.organizations.eventId, org.eventId),
        });
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save organization",
        error,
      );
    }
  }

  async deleteOrganization(eventId: EventId, id: OrgId): Promise<void> {
    try {
      await this.db
        .delete(schema.organizations)
        .where(and(eq(schema.organizations.id, id), eq(schema.organizations.eventId, eventId)));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to delete organization",
        error,
      );
    }
  }

  async saveMember(member: OrgMember): Promise<void> {
    try {
      await this.db
        .insert(schema.orgMembers)
        .values({
          id: member.id,
          orgId: member.orgId,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt,
        })
        .onConflictDoUpdate({
          target: schema.orgMembers.id,
          set: {
            // Immutable fields excluded: id, orgId, userId, createdAt
            role: member.role,
          },
        });
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to save member",
        error,
      );
    }
  }

  async removeMember(orgId: OrgId, userId: UserId): Promise<void> {
    try {
      await this.db
        .delete(schema.orgMembers)
        .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.userId, userId)));
    } catch (error) {
      throw new RepositoryExceptionError(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "Failed to remove member",
        error,
      );
    }
  }
}
