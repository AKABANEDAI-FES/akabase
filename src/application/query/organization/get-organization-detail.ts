import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { eventIdSchema, orgIdSchema } from "@/domain/shared/ids";
import type { OrgId } from "@/domain/shared/ids";

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
 * @param orgId - Organization ID
 * @returns Result with organization detail or error
 */
export async function getOrganizationDetail(
  orgId: OrgId,
): Promise<Result.Result<OrganizationDetail, QueryError>> {
  try {
    const row = await db.query.organizations.findFirst({
      where: (organizations, { eq }) => eq(organizations.id, orgId),
    });

    if (!row) {
      return Result.fail({
        code: "NOT_FOUND",
        message: "団体が見つかりません。",
      });
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

    return Result.succeed(detail);
  } catch (error) {
    console.error("[Query Error] Failed to get organization detail", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "団体詳細の取得に失敗しました。",
    });
  }
}
