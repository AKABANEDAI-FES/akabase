import type { AllowedImageType } from "@/domain/shared/storage";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_ERROR_MESSAGES,
} from "@/domain/shared/storage";
import { useMutation } from "@tanstack/react-query";

export async function uploadImage(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(STORAGE_ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    throw new Error(STORAGE_ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json<{ message?: string }>();
    throw new Error(errorData.message || STORAGE_ERROR_MESSAGES.UPLOAD_FAILED);
  }
  const resultData = await response.json<{ imageId: string }>();
  return resultData.imageId;
}

export function useUploadImageMutation() {
  return useMutation({
    mutationFn: uploadImage,
  });
}
