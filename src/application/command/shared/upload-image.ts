import { Result } from "@praha/byethrow";
import { images } from "@/db/schema";
import type { Dependencies } from "@/infrastructure/di";
import type { AllowedImageType, ImageScope, StorageError } from "@/domain/shared/storage";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_ERROR_CODE,
  STORAGE_ERROR_MESSAGES,
  storageError,
} from "@/domain/shared/storage";

/**
 * Input for uploading an image
 */
export type UploadImageInput = {
  file: ArrayBuffer;
  contentType: string;
  userId: string;
  scope: ImageScope;
};

/**
 * Upload image to R2 storage and save metadata to DB
 *
 * Business rules:
 * - Allowed types: JPEG, PNG, WebP
 * - Max size: 300KB
 * - Returns image ID (primary key in images table)
 *
 * @param deps - Dependencies (storageService)
 * @param input - Upload input
 * @returns Result with image ID or error
 */
export type UploadImageOutput = {
  imageId: string;
  objectKey: string;
};

export async function uploadImage(
  deps: Pick<Dependencies, "storageService" | "db">,
  input: UploadImageInput,
): Promise<Result.Result<UploadImageOutput, StorageError>> {
  // Validate file size
  const size = input.file.byteLength;
  if (size > MAX_FILE_SIZE) {
    return Result.fail(
      storageError(STORAGE_ERROR_CODE.FILE_TOO_LARGE, STORAGE_ERROR_MESSAGES.FILE_TOO_LARGE),
    );
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(input.contentType as AllowedImageType)) {
    return Result.fail(
      storageError(STORAGE_ERROR_CODE.INVALID_FILE_TYPE, STORAGE_ERROR_MESSAGES.INVALID_FILE_TYPE),
    );
  }

  // Upload to R2
  const uploadResult = await deps.storageService.uploadImage(input.file, {
    contentType: input.contentType,
    scope: input.scope,
  });
  if (Result.isFailure(uploadResult)) {
    return uploadResult;
  }

  const { id, objectKey } = uploadResult.value;

  // Save metadata to DB
  try {
    await deps.db.insert(images).values({
      id,
      objectKey,
      contentType: input.contentType,
      size,
      scopeType: input.scope.type,
      uploadedBy: input.userId,
    });
  } catch (error) {
    // Rollback: Delete uploaded file from R2 if DB insert fails
    await deps.storageService.deleteImage(objectKey);
    return Result.fail(
      storageError(STORAGE_ERROR_CODE.UPLOAD_FAILED, "画像のメタデータ保存に失敗しました", error),
    );
  }

  return Result.succeed({ imageId: id, objectKey });
}
