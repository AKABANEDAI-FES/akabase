import { z } from "zod";
import { db } from "@/db";
import { eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import type { Dependencies } from "@/infrastructure/di";
import { organizationResource } from "@/domain/authorization/logic";
import { QueryException } from "../shared";
import { Result } from "@praha/byethrow";

/**
 * DTO schema for organization detail
 */
export const organizationDetailSchema = z.object({
  id: orgIdSchema,
  eventId: eventIdSchema,
  name: z.string(),
  description: z.string(),
  logoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrganizationDetail = z.infer<typeof organizationDetailSchema>;

/**
 * Get organization detail by ID
 *
 * Authorization: Committee members or organization members can read
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns Organization detail or null if not found
 * @throws {QueryException} When database operation fails or authorization is denied
 */
export async function getOrganizationDetail(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Promise<OrganizationDetail | null> {
  // Authorization check
  const authResult = deps.authService.enforce(
    actor,
    organizationResource(orgId, eventId),
    "organization:read",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const row = await db.query.organizations.findFirst({
      where: (organizations, { eq, and }) =>
        and(eq(organizations.id, orgId), eq(organizations.eventId, eventId)),
    });

    if (!row) {
      return null;
    }

    const detail: OrganizationDetail = organizationDetailSchema.parse({
      id: row.id,
      eventId: row.eventId,
      name: row.name,
      description: row.description,
      logoKey: row.logoKey,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });

    return detail;
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "団体詳細の取得に失敗しました。", error);
  }
}
