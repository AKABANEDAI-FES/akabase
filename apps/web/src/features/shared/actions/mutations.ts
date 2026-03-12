import { apiClient } from "@/api/client";
import type { ImageScope } from "@archive/domain/shared/image";
import { mutationOptions } from "@tanstack/react-query";

export async function uploadImage({ file, scope }: { file: File; scope: ImageScope }) {
  const response = await apiClient.storage.upload.$post({
    form: {
      file,
      scope: JSON.stringify(scope),
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "画像のアップロードに失敗しました。");
  }
  const resultData = await response.json();
  return resultData;
}

export function useUploadImageMutationOption() {
  return mutationOptions({
    mutationFn: uploadImage,
  });
}
