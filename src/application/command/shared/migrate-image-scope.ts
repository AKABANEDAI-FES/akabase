import { Result } from "@praha/byethrow";
import { eq } from "drizzle-orm";
import { images } from "@/db/schema";
import type { Dependencies } from "@/infrastructure/di";
import type { ImageScope } from "@/domain/shared/storage";
import { buildObjectKeyPrefix } from "@/domain/shared/storage";

/**
 * Migrate a pending image's scope to its correct scope.
 *
 * - Updates DB: scopeType and objectKey
 * - Moves R2 object via copy + delete
 * - Skips if image is not pending (already migrated)
 * - Errors are logged but do not propagate (best-effort migration)
 */
export async function migrateImageScope(
  deps: Pick<Dependencies, "db" | "storageService">,
  imageId: string,
  newScope: ImageScope,
): Promise<void> {
  try {
    // const [image] = await deps.db.select().from(images).where(eq(images.id, imageId)).limit(1);
    const image = await deps.db.query.images.findFirst({
      where: (images, { eq, and }) => and(eq(images.id, imageId), eq(images.scopeType, "pending")),
    });

    if (!image) {
      return;
    }

    // Extract filename from old objectKey: "pending/abc123.jpg" → "abc123.jpg"
    const filename = image.objectKey.split("/").pop();
    if (!filename) {
      return;
    }

    const newPrefix = buildObjectKeyPrefix(newScope);
    const newObjectKey = `${newPrefix}/${filename}`;

    // Move R2 object
    const moveResult = await deps.storageService.moveImage(image.objectKey, newObjectKey);
    if (Result.isFailure(moveResult)) {
      console.error(
        `[migrateImageScope] R2 move failed for image ${imageId}:`,
        moveResult.error.message,
      );
      return;
    }

    // Update DB record
    await deps.db
      .update(images)
      .set({
        objectKey: newObjectKey,
        scopeType: newScope.type,
      })
      .where(eq(images.id, imageId));
  } catch (error) {
    console.error(`[migrateImageScope] Failed to migrate image ${imageId}:`, error);
  }
}
