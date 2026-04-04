import { z } from "zod";
import { Result } from "@akabase/result";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import { eventIdSchema } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import { orgIdSchema } from "@akabase/domain/organization/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { organizationResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const organizationDetailSchema = z.object({
  id: orgIdSchema,
  eventId: eventIdSchema,
  name: z.string(),
  description: z.string(),
  logoImageId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrganizationDetail = z.infer<typeof organizationDetailSchema>;

export async function getOrganizationDetail(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Promise<OrganizationDetail | null> {
  const authResult = deps.authService.enforce(
    actor,
    organizationResource(orgId, eventId),
    "organization:read",
  );
  if (Result.isFailure(authResult)) {
    return null;
  }

  try {
    const row = await deps.db.query.organizations.findFirst({
      where: (organizations, { eq, and }) =>
        and(eq(organizations.id, orgId), eq(organizations.eventId, eventId)),
    });

    if (!row) {
      return null;
    }

    return organizationDetailSchema.parse({
      id: row.id,
      eventId: row.eventId,
      name: row.name,
      description: row.description,
      logoImageId: row.logoImageId,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "出展団体詳細の取得に失敗しました。", error);
  }
}
