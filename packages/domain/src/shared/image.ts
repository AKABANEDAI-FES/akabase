import { z } from "zod";
import type { BaseError } from "./errors";
import { createError } from "./errors";
import { Result } from "@akabase/result";
import type { UserId } from "../user/schema";

/**
 * Image ID
 */
export const imageIdSchema = z.string().brand<"ImageId">();
export type ImageId = z.infer<typeof imageIdSchema>;

/**
 * Image scope for storage path classification
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

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

function isAllowedImageType(contentType: string): contentType is AllowedImageType {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return ALLOWED_IMAGE_TYPES.includes(contentType as AllowedImageType);
}

// oxlint-disable-next-line no-magic-numbers
export const MAX_FILE_SIZE = 300 * 1024; // 300KB

export const IMAGE_VALIDATION_ERROR_CODE = {
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
} as const;

export type ImageValidationErrorCode =
  (typeof IMAGE_VALIDATION_ERROR_CODE)[keyof typeof IMAGE_VALIDATION_ERROR_CODE];

export type ImageValidationError = BaseError<ImageValidationErrorCode>;

export class ValidatedImage {
  readonly file: ArrayBuffer;
  readonly contentType: AllowedImageType;
  readonly size: number;

  private constructor(file: ArrayBuffer, contentType: AllowedImageType) {
    this.file = file;
    this.contentType = contentType;
    this.size = file.byteLength;
  }

  static create(
    file: ArrayBuffer,
    contentType: string,
  ): Result.Result<ValidatedImage, ImageValidationError> {
    if (file.byteLength > MAX_FILE_SIZE) {
      return Result.fail(
        createError(
          IMAGE_VALIDATION_ERROR_CODE.FILE_TOO_LARGE,
          "ファイルサイズが大きすぎます。最大300KBまで対応しています。",
        ),
      );
    }
    if (!isAllowedImageType(contentType)) {
      return Result.fail(
        createError(
          IMAGE_VALIDATION_ERROR_CODE.INVALID_FILE_TYPE,
          "無効なファイル形式です。JPG、PNG、WebPのみ対応しています。",
        ),
      );
    }
    return Result.succeed(new ValidatedImage(file, contentType));
  }
}

export type UploadImageResult = {
  id: ImageId;
  objectKey: string;
};

export type ImageRepository = {
  /**
   * Upload image to storage and save metadata to DB
   * @throws {RepositoryExceptionError} on storage errors
   */
  uploadImage(image: ValidatedImage, scope: ImageScope, userId: UserId): Promise<UploadImageResult>;

  /**
   * Delete image by key
   * @throws {RepositoryExceptionError} on storage errors
   */
  deleteImage(key: string): Promise<void>;

  /**
   * Migrate a pending image to its correct scope
   * Looks up image by ID, moves in R2, updates DB (objectKey, scopeType)
   * Skips if image is not pending (already migrated)
   * @throws {RepositoryExceptionError} on storage errors
   */
  migrateScope(imageId: ImageId, newScope: ImageScope): Promise<void>;

  /**
   * Get public URL for an image
   */
  getPublicUrl(key: string): string;
};
