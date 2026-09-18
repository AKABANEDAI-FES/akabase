import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { Result } from "@akabase/result";
import { schema } from "@akabase/infrastructure/db";
import type { Database } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import {
  eventIdSchema,
  placeIdSchema,
  projectCategoryIdSchema,
} from "@akabase/domain/event/schema";
import { orgIdSchema } from "@akabase/domain/organization/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import { projectIdSchema, submissionStatusSchema } from "@akabase/domain/project/schema";
import type { Actor } from "@akabase/domain/authorization/schema";
import { organizationResource } from "@akabase/domain/authorization/logic";
import type { AuthorizationService } from "@akabase/domain/authorization/service";
import { QueryExceptionError } from "../shared";

export const projectListItemSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string(),
  placeId: placeIdSchema.nullable(),
  placeName: z.string().nullable(),
  categoryId: projectCategoryIdSchema.nullable(),
  categoryName: z.string().nullable(),
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
    throw new QueryExceptionError("VALIDATION_ERROR", authResult.error.message, authResult.error);
  }

  try {
    const rows = await deps.db.query.projects.findMany({
      where: and(eq(schema.projects.orgId, orgId), eq(schema.projects.eventId, eventId)),
      orderBy: [desc(schema.projects.createdAt)],
      with: {
        place: true,
        category: true,
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
        categoryId: row.categoryId,
        categoryName: row.category?.name ?? null,
        logoImageId: row.logoImageId,
        latestSubmissionStatus: row.submissions[0]?.status ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    );
  } catch (error) {
    throw new QueryExceptionError("DATABASE_ERROR", "企画一覧の取得に失敗しました。", error);
  }
}
