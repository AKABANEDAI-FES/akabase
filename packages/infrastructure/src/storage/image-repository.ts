import { generateId } from "@archive/domain/shared/ids";
import type {
  ImageRepository,
  ImageScope,
  UploadImageResult,
  ValidatedImage,
} from "@archive/domain/shared/image";
import { REPOSITORY_ERROR_CODE, RepositoryException } from "@archive/domain/shared/repository";

function buildObjectKeyPrefix(scope: ImageScope): string {
  switch (scope.type) {
    case "system": {
      return "system";
    }
    case "event": {
      return `events/${scope.eventId}`;
    }
    case "organization": {
      return `events/${scope.eventId}/orgs/${scope.orgId}`;
    }
    case "project": {
      return `events/${scope.eventId}/projects/${scope.projectId}`;
    }
    case "pending": {
      return "pending";
    }
    default: {
      scope satisfies never;
      throw new Error("Invalid image scope");
    }
  }
}

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export class ImageRepositoryImpl implements ImageRepository {
  private readonly bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async uploadImage(image: ValidatedImage, scope: ImageScope): Promise<UploadImageResult> {
    try {
      const uniqueId = generateId();
      const extension = EXTENSION_MAP[image.contentType] ?? "";
      const prefix = buildObjectKeyPrefix(scope);
      const objectKey = `${prefix}/${uniqueId}${extension}`;

      await this.bucket.put(objectKey, image.file, {
        httpMetadata: {
          contentType: image.contentType,
        },
      });

      return { id: uniqueId, objectKey };
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "画像のアップロードに失敗しました。",
        error,
      );
    }
  }

  async deleteImage(key: string): Promise<void> {
    try {
      await this.bucket.delete(key);
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "画像の削除に失敗しました。",
        error,
      );
    }
  }

  // oxlint-disable-next-line class-methods-use-this
  getPublicUrl(key: string): string {
    return `/api/storage/${key}`;
  }

  async moveImage(fromKey: string, newScope: ImageScope): Promise<void> {
    try {
      const obj = await this.bucket.get(fromKey);
      if (!obj) {
        throw new RepositoryException(
          REPOSITORY_ERROR_CODE.DATABASE_ERROR,
          "移動元の画像が見つかりません。",
        );
      }
      const toKey = buildObjectKeyPrefix(newScope);
      await this.bucket.put(toKey, await obj.arrayBuffer(), {
        httpMetadata: obj.httpMetadata,
      });
      await this.bucket.delete(fromKey);
    } catch (error) {
      if (error instanceof RepositoryException) {
        throw error;
      }
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "画像の移動に失敗しました。",
        error,
      );
    }
  }
}
