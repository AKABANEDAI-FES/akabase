import type { Result } from "@praha/byethrow";
import type { BaseError } from "./errors";
import { createError } from "./errors";

/**
 * Storage Error Types
 */
export const STORAGE_ERROR_CODE = {
  UPLOAD_FAILED: "UPLOAD_FAILED",
  DELETE_FAILED: "DELETE_FAILED",
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
export interface StorageService {
  /**
   * Upload image to R2
   * @param file - File buffer or ArrayBuffer
   * @param options - Upload options (contentType, metadata)
   * @returns R2 object key
   */
  uploadImage(
    file: ArrayBuffer,
    options: UploadOptions,
  ): Promise<Result.Result<string, StorageError>>;

  /**
   * Delete image from R2
   * @param key - R2 object key
   */
  deleteImage(key: string): Promise<Result.Result<void, StorageError>>;

  /**
   * Get public URL for an image
   * @param key - R2 object key
   * @returns Full public URL
   */
  getPublicUrl(key: string): string;
}

export type UploadOptions = {
  contentType: string;
  prefix?: string; // e.g., "organizations", "projects"
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
  STORAGE_URL_NOT_CONFIGURED: "ストレージのURLが設定されていません。",
} as const;
