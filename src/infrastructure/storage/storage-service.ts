import { Result } from "@praha/byethrow";
import { env } from "cloudflare:workers";
import { generateId } from "@/libs/id";
import type {
  StorageError,
  StorageService,
  UploadImageResult,
  UploadOptions,
} from "@/domain/shared/storage";
import {
  STORAGE_ERROR_CODE,
  STORAGE_ERROR_MESSAGES,
  buildObjectKeyPrefix,
  storageError,
} from "@/domain/shared/storage";

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
      const prefix = buildObjectKeyPrefix(options.scope);
      const objectKey = `${prefix}/${uniqueId}${extension}`;

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
   * Move image in R2 (copy + delete)
   */
  async moveImage(fromKey: string, toKey: string): Promise<Result.Result<void, StorageError>> {
    try {
      const obj = await env.STORAGE.get(fromKey);
      if (!obj) {
        return Result.fail(
          storageError(STORAGE_ERROR_CODE.MOVE_FAILED, STORAGE_ERROR_MESSAGES.MOVE_FAILED),
        );
      }
      await env.STORAGE.put(toKey, await obj.arrayBuffer(), {
        httpMetadata: obj.httpMetadata,
      });
      await env.STORAGE.delete(fromKey);
      return Result.succeed(undefined);
    } catch (error) {
      return Result.fail(
        storageError(STORAGE_ERROR_CODE.MOVE_FAILED, STORAGE_ERROR_MESSAGES.MOVE_FAILED, error),
      );
    }
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
