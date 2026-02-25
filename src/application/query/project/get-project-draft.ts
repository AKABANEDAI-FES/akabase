import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { projectDrafts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { projectIdSchema, userIdSchema } from "@/domain/shared/ids";
import type { ProjectId } from "@/domain/shared/ids";
import { projectDraftSchema } from "@/domain/project/schema";
import { tagSchema } from "@/domain/event/schema";

/**
 * DTO schema for project draft
 */
export const draftDetailSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: projectDraftSchema.shape.pamphletText,
  webContentJson: projectDraftSchema.shape.webContentJson,
  updatedAt: z.date(),
  updatedBy: userIdSchema,
  tags: tagSchema.pick({ id: true, name: true }).array(),
});

export type DraftDetail = z.infer<typeof draftDetailSchema>;

export type QueryError = {
  code: "DATABASE_ERROR" | "NOT_FOUND";
  message: string;
};

/**
 * Get draft by project ID
 *
 * @param projectId - Project ID
 * @returns Result with draft detail or error
 */
export async function getDraft(
  projectId: ProjectId,
): Promise<Result.Result<DraftDetail, QueryError>> {
  try {
    const draftRow = await db.query.projectDrafts.findFirst({
      where: eq(projectDrafts.projectId, projectId),
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!draftRow) {
      return Result.fail({
        code: "NOT_FOUND",
        message: "下書きが見つかりません。",
      });
    }

    const draft = draftDetailSchema.parse({
      projectId: draftRow.projectId,
      pamphletText: draftRow.pamphletText,
      webContentJson: draftRow.webContentJson,
      updatedAt: draftRow.updatedAt,
      updatedBy: draftRow.updatedBy,
      tags: draftRow.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
    });

    return Result.succeed(draft);
  } catch (error) {
    console.error("[Query Error] Failed to get draft", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "下書きの取得に失敗しました。",
    });
  }
}
