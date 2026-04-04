/**
 * Upload image command
 * Validates and uploads an image to storage
 */

import { Result } from "@akabase/result";
import { ValidatedImage } from "@akabase/domain/shared/image";
import type {
  ImageId,
  ImageRepository,
  ImageScope,
  ImageValidationError,
} from "@akabase/domain/shared/image";
import type { UserId } from "@akabase/domain/user/schema";

export type UploadImageInput = {
  file: ArrayBuffer;
  contentType: string;
  userId: UserId;
  scope: ImageScope;
};

export type UploadImageOutput = {
  imageId: ImageId;
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
  const { id, objectKey } = await deps.imageRepo.uploadImage(image, input.scope, input.userId);

  return Result.succeed({ imageId: id, objectKey });
}
