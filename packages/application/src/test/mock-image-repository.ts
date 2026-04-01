import { generateId } from "@archive/domain/shared/ids";
import type {
  ImageId,
  ImageRepository,
  ImageScope,
  UploadImageResult,
  ValidatedImage,
} from "@archive/domain/shared/image";
import type { UserId } from "@archive/domain/user/schema";

export class MockImageRepository implements ImageRepository {
  private readonly uploadedFiles = new Map<string, { id: string; objectKey: string }>();

  async uploadImage(
    _image: ValidatedImage,
    scope: ImageScope,
    _userId: UserId,
  ): Promise<UploadImageResult> {
    const id = generateId<ImageId>();
    const objectKey = `${scope.type}/${id}.jpg`;

    this.uploadedFiles.set(objectKey, { id, objectKey });

    return { id, objectKey };
  }

  async deleteImage(key: string): Promise<void> {
    this.uploadedFiles.delete(key);
  }

  // oxlint-disable-next-line class-methods-use-this
  async migrateScope(_imageId: ImageId, _newScope: ImageScope): Promise<void> {
    // no-op for tests
  }

  // oxlint-disable-next-line class-methods-use-this
  getPublicUrl(key: string): string {
    return `https://mock-storage.example.com/${key}`;
  }

  getUploadedFiles(): string[] {
    return [...this.uploadedFiles.keys()];
  }

  clear(): void {
    this.uploadedFiles.clear();
  }
}
