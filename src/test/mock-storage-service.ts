import { Result } from "@praha/byethrow";
import { generateId } from "@/libs/id";
import type {
  StorageError,
  StorageService,
  UploadImageResult,
  UploadOptions,
} from "@/domain/shared/storage";

export class MockStorageService implements StorageService {
  private uploadedFiles = new Map<string, { id: string; objectKey: string }>();

  async uploadImage(
    _file: ArrayBuffer,
    _options: UploadOptions,
  ): Promise<Result.Result<UploadImageResult, StorageError>> {
    const id = generateId();
    const objectKey = `${id}.jpg`;

    this.uploadedFiles.set(objectKey, { id, objectKey });

    return Result.succeed({ id, objectKey });
  }

  async deleteImage(key: string): Promise<Result.Result<void, StorageError>> {
    this.uploadedFiles.delete(key);
    return Result.succeed(undefined);
  }

  getPublicUrl(key: string): string {
    return `https://mock-storage.example.com/${key}`;
  }

  getUploadedFiles(): string[] {
    return Array.from(this.uploadedFiles.keys());
  }

  clear(): void {
    this.uploadedFiles.clear();
  }
}
