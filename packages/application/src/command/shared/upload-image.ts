/**
 * Upload image command
 * Validates and uploads an image to storage
 */

import { Result } from "@archive/result";
import { ValidatedImage } from "@archive/domain/shared/image";
import type {
  ImageRepository,
  ImageScope,
  ImageValidationError,
} from "@archive/domain/shared/image";

export type UploadImageInput = {
  file: ArrayBuffer;
  contentType: string;
  userId: string;
  scope: ImageScope;
};

export type UploadImageOutput = {
  imageId: string;
  objectKey: string;
};

export async function uploadImage(
  deps: {
    imageRepo: ImageRepository;
  },
  input: UploadImageInput,
): Promise<Result.Result<UploadImageOutput, ImageValidationError>> {
  const validationResult = ValidatedImage.create(input.file, input.contentType);
  if (Result.isFailure(validationResult)) {
    return validationResult;
  }

  const image = validationResult.value;
  const { id, objectKey } = await deps.imageRepo.uploadImage(image, input.scope);

  return Result.succeed({ imageId: id, objectKey });
}
