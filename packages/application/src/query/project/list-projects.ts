import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { Result } from "@archive/result";
import { schema } from "@archive/infrastructure/db";
import type { Database } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { eventIdSchema, placeIdSchema } from "@archive/domain/event/schema";
import { orgIdSchema } from "@archive/domain/organization/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import { projectIdSchema, submissionStatusSchema } from "@archive/domain/project/schema";
import type { Actor } from "@archive/domain/authorization/schema";
import { organizationResource } from "@archive/domain/authorization/logic";
import type { AuthorizationService } from "@archive/domain/authorization/service";
import { QueryException } from "../shared";

export const projectListItemSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string(),
  placeId: placeIdSchema.nullable(),
  placeName: z.string().nullable(),
  logoImageId: z.string().nullable(),
  latestSubmissionStatus: submissionStatusSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

export async function listProjects(
  deps: { db: Database; authService: AuthorizationService },
  eventId: EventId,
  orgId: OrgId,
  actor: Actor,
): Promise<ProjectListItem[]> {
  const authResult = deps.authService.enforce(
    actor,
    organizationResource(orgId, eventId),
    "organization:read",
  );
  if (Result.isFailure(authResult)) {
    throw new QueryException("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db.query.projects.findMany({
      where: and(eq(schema.projects.orgId, orgId), eq(schema.projects.eventId, eventId)),
      orderBy: [desc(schema.projects.createdAt)],
      with: {
        place: true,
        submissions: {
          limit: 1,
          orderBy: [desc(schema.projectSubmissions.submittedAt)],
          columns: {
            status: true,
          },
        },
      },
    });

    return rows.map((row) =>
      projectListItemSchema.parse({
        id: row.id,
        eventId: row.eventId,
        orgId: row.orgId,
        name: row.name,
        placeId: row.placeId,
        placeName: row.place?.name ?? null,
        logoImageId: row.logoImageId,
        latestSubmissionStatus: row.submissions[0]?.status ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    );
  } catch (error) {
    throw new QueryException("DATABASE_ERROR", "企画一覧の取得に失敗しました。", error);
  }
}
