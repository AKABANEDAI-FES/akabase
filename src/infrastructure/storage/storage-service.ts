import { Result } from "@praha/byethrow";
import { env } from "cloudflare:workers";
import { generateId } from "@/libs/id";
import type {
  StorageError,
  StorageService,
  UploadImageResult,
  UploadOptions,
} from "@/domain/shared/storage";
import { STORAGE_ERROR_CODE, STORAGE_ERROR_MESSAGES, storageError } from "@/domain/shared/storage";

/**
 * R2 Storage Service Implementation
 */
export class StorageServiceImpl implements StorageService {
  /**
   * Upload image to R2
   */
  async uploadImage(
    file: ArrayBuffer,
    options: UploadOptions,
  ): Promise<Result.Result<UploadImageResult, StorageError>> {
    try {
      const uniqueId = generateId();
      const extension = this.getExtensionFromContentType(options.contentType);
      const objectKey = `${uniqueId}${extension}`;

      await env.STORAGE.put(objectKey, file, {
        httpMetadata: {
          contentType: options.contentType,
        },
      });

      return Result.succeed({ id: uniqueId, objectKey });
    } catch (error) {
      return Result.fail(
        storageError(STORAGE_ERROR_CODE.UPLOAD_FAILED, STORAGE_ERROR_MESSAGES.UPLOAD_FAILED, error),
      );
    }
  }

  /**
   * Delete image from R2
   */
  async deleteImage(key: string): Promise<Result.Result<void, StorageError>> {
    try {
      await env.STORAGE.delete(key);
      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(
        storageError(STORAGE_ERROR_CODE.DELETE_FAILED, STORAGE_ERROR_MESSAGES.DELETE_FAILED, error),
      );
    }
  }

  /**
   * Get public URL for an image
   */
  getPublicUrl(key: string): string {
    return `/api/storage/${key}`;
  }

  /**
   * Helper: Extract file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    return map[contentType] || "";
  }
}
