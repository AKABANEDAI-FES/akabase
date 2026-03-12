/**
 * Migrate image scope
 * Moves a pending image to its correct scope (best-effort)
 */

import type { ImageId, ImageRepository, ImageScope } from "@archive/domain/shared/image";

export async function migrateImageScope(
  deps: {
    imageRepo: ImageRepository;
  },
  imageId: ImageId,
  newScope: ImageScope,
): Promise<void> {
  try {
    await deps.imageRepo.migrateScope(imageId, newScope);
  } catch {
    // Best-effort migration, silently ignore failures
  }
}
