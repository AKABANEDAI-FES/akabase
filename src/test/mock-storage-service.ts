import { Result } from "@praha/byethrow";
import { generateId } from "@/libs/id";
import type {
  StorageError,
  StorageService,
  UploadImageResult,
  UploadOptions,
} from "@/domain/shared/storage";
import { buildObjectKeyPrefix } from "@/domain/shared/storage";

export class MockStorageService implements StorageService {
  private uploadedFiles = new Map<string, { id: string; objectKey: string }>();

  async uploadImage(
    _file: ArrayBuffer,
    options: UploadOptions,
  ): Promise<Result.Result<UploadImageResult, StorageError>> {
    const id = generateId();
    const prefix = buildObjectKeyPrefix(options.scope);
    const objectKey = `${prefix}/${id}.jpg`;

    this.uploadedFiles.set(objectKey, { id, objectKey });

    return Result.succeed({ id, objectKey });
  }

  async deleteImage(key: string): Promise<Result.Result<void, StorageError>> {
    this.uploadedFiles.delete(key);
    return Result.succeed(undefined);
  }

  async moveImage(fromKey: string, toKey: string): Promise<Result.Result<void, StorageError>> {
    const file = this.uploadedFiles.get(fromKey);
    if (file) {
      this.uploadedFiles.delete(fromKey);
      this.uploadedFiles.set(toKey, { ...file, objectKey: toKey });
    }
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
