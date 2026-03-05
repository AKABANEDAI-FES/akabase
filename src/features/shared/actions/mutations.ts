import { apiClient } from "@/api/client";
import type { AllowedImageType, ImageScope } from "@/domain/shared/storage";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_ERROR_MESSAGES,
} from "@/domain/shared/storage";
import { useMutation } from "@tanstack/react-query";

export async function uploadImage({ file, scope }: { file: File; scope: ImageScope }) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(STORAGE_ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    throw new Error(STORAGE_ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  const response = await apiClient.storage.upload.$post({
    form: {
      file,
      scope: JSON.stringify(scope),
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || STORAGE_ERROR_MESSAGES.UPLOAD_FAILED);
  }
  const resultData = await response.json();
  return resultData;
}

export function useUploadImageMutation() {
  return useMutation({
    mutationFn: uploadImage,
  });
}
