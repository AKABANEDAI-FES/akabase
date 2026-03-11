/**
 * Migrate image scope
 * Moves a pending image to its correct scope (best-effort)
 */

import type { ImageRepository, ImageScope } from "@archive/domain/shared/image";

export async function migrateImageScope(
  deps: {
    imageRepo: ImageRepository;
  },
  oldObjectKey: string,
  newScope: ImageScope,
): Promise<void> {
  try {
    await deps.imageRepo.moveImage(oldObjectKey, newScope);
  } catch {
    // Best-effort migration, silently ignore failures
  }
}
