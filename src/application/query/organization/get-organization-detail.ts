import { z } from "zod";
import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { db } from "@/db";
import { eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Dependencies } from "@/infrastructure/di";
import { organizationResource } from "@/domain/authorization/logic";

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

export type QueryError = {
  code: "DATABASE_ERROR" | "NOT_FOUND";
  message: string;
};

/**
 * Get organization detail by ID
 *
 * Authorization: Committee members or organization members can read
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns Result with organization detail or error
 */
export async function getOrganizationDetail(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Result.ResultAsync<OrganizationDetail, QueryError | AuthorizationError> {
  return gen(async function* ($) {
    // Fetch organization to get eventId
    try {
      yield* $(
        deps.authService.enforce(actor, organizationResource(orgId, eventId), "organization:read"),
      );

      const row = await db.query.organizations.findFirst({
        where: (organizations, { eq, and }) =>
          and(eq(organizations.id, orgId), eq(organizations.eventId, eventId)),
      });

      if (!row) {
        return yield* $(
          Result.fail({
            code: "NOT_FOUND",
            message: "団体が見つかりません。",
          }),
        );
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
      console.error("[Query Error] Failed to get organization detail", error);
      return yield* $(
        Result.fail({
          code: "DATABASE_ERROR",
          message: "団体詳細の取得に失敗しました。",
        }),
      );
    }
  });
}
