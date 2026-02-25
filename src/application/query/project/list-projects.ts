import { z } from "zod";
import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { eventIdSchema, orgIdSchema, placeIdSchema, projectIdSchema } from "@/domain/shared/ids";
import type { EventId, OrgId } from "@/domain/shared/ids";
import type { Actor } from "@/domain/authorization/schema";
import type { AuthorizationError } from "@/domain/authorization/errors";
import type { Dependencies } from "@/infrastructure/di";
import { organizationResource } from "@/domain/authorization/logic";

/**
 * DTO schema for project list item
 */
export const projectListItemSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string(),
  placeId: placeIdSchema.nullable(),
  placeName: z.string().nullable(),
  logoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

export type QueryError = {
  code: "DATABASE_ERROR";
  message: string;
};

/**
 * List projects for an organization
 *
 * Authorization: Committee members or organization members can read
 *
 * @param deps - Dependencies (authService)
 * @param eventId - Event ID
 * @param orgId - Organization ID
 * @param actor - Actor (authenticated user with permissions)
 * @returns Result with list of projects or error
 */
export async function listProjects(
  deps: Pick<Dependencies, "authService">,
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Result.ResultAsync<ProjectListItem[], QueryError | AuthorizationError> {
  return gen(async function* ($) {
    // Authorization check: organization:read permission
    yield* $(
      deps.authService.enforce(actor, organizationResource(orgId, eventId), "organization:read"),
    );

    try {
      const rows = await db.query.projects.findMany({
        where: and(eq(projects.orgId, orgId), eq(projects.eventId, eventId)),
        orderBy: [desc(projects.createdAt)],
        with: { place: true },
      });

      const items: ProjectListItem[] = rows.map((row) =>
        projectListItemSchema.parse({
          id: row.id,
          eventId: row.eventId,
          orgId: row.orgId,
          name: row.name,
          placeId: row.placeId,
          placeName: row.place?.name ?? null,
          logoKey: row.logoKey,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      );

      return items;
    } catch (error) {
      console.error("[Query Error] Failed to list projects", error);
      return yield* $(
        Result.fail({
          code: "DATABASE_ERROR",
          message: "企画一覧の取得に失敗しました。",
        }),
      );
    }
  });
}
