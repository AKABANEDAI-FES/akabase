import type { Result } from "@praha/byethrow";
import type { BaseError } from "./errors";
import { createError } from "./errors";
import z from "zod";

/**
 * Storage Error Types
 */
export const STORAGE_ERROR_CODE = {
  UPLOAD_FAILED: "UPLOAD_FAILED",
  DELETE_FAILED: "DELETE_FAILED",
  MOVE_FAILED: "MOVE_FAILED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  INVALID_INPUT: "INVALID_INPUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type StorageErrorCode = (typeof STORAGE_ERROR_CODE)[keyof typeof STORAGE_ERROR_CODE];

export type StorageError = BaseError<StorageErrorCode>;

export function storageError(
  code: StorageErrorCode,
  message: string,
  error?: unknown,
): StorageError {
  if (error) {
    console.error(`[StorageError] ${code}: ${message}`, error);
  }
  return createError(code, message);
}

/**
 * Storage Service Interface
 */
/**
 * Result of uploading an image to R2
 */
export type UploadImageResult = {
  id: string;
  objectKey: string;
};

export interface StorageService {
  /**
   * Upload image to R2
   * @param file - File buffer or ArrayBuffer
   * @param options - Upload options (contentType)
   * @returns Upload result with id and objectKey
   */
  uploadImage(
    file: ArrayBuffer,
    options: UploadOptions,
  ): Promise<Result.Result<UploadImageResult, StorageError>>;

  /**
   * Delete image from R2
   * @param key - R2 object key
   */
  deleteImage(key: string): Promise<Result.Result<void, StorageError>>;

  /**
   * Move image in R2 (copy + delete)
   * @param fromKey - Source R2 object key
   * @param toKey - Destination R2 object key
   */
  moveImage(fromKey: string, toKey: string): Promise<Result.Result<void, StorageError>>;

  /**
   * Get public URL for an image
   * @param key - R2 object key
   * @returns Full public URL
   */
  getPublicUrl(key: string): string;
}

/**
 * Image scope for objectKey prefix classification
 */
export const imageScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("system") }),
  z.object({ type: z.literal("event"), eventId: z.string() }),
  z.object({
    type: z.literal("organization"),
    eventId: z.string(),
    orgId: z.string(),
  }),
  z.object({
    type: z.literal("project"),
    eventId: z.string(),
    projectId: z.string(),
  }),
  z.object({ type: z.literal("pending") }),
]);

export type ImageScope = z.infer<typeof imageScopeSchema>;

export type ImageScopeType = ImageScope["type"];

/**
 * Build objectKey prefix from scope
 */
export function buildObjectKeyPrefix(scope: ImageScope): string {
  switch (scope.type) {
    case "system":
      return "system";
    case "event":
      return `events/${scope.eventId}`;
    case "organization":
      return `events/${scope.eventId}/orgs/${scope.orgId}`;
    case "project":
      return `events/${scope.eventId}/projects/${scope.projectId}`;
    case "pending":
      return "pending";
  }
}

export type UploadOptions = {
  contentType: string;
  scope: ImageScope;
};

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Max file size: 2MB
 */
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

/**
 * Storage error messages
 */
export const STORAGE_ERROR_MESSAGES = {
  INVALID_FILE_TYPE: "無効なファイル形式です。JPG、PNG、WebPのみ対応しています。",
  FILE_TOO_LARGE: "ファイルサイズが大きすぎます。最大2MBまで対応しています。",
  UPLOAD_FAILED: "画像のアップロードに失敗しました。",
  DELETE_FAILED: "画像の削除に失敗しました。",
  MOVE_FAILED: "画像の移動に失敗しました。",
} as const;
