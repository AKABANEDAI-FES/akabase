import { eq } from "drizzle-orm";
import { generateId } from "@archive/domain/shared/ids";
import type {
  ImageId,
  ImageRepository,
  ImageScope,
  UploadImageResult,
  ValidatedImage,
} from "@archive/domain/shared/image";
import type { UserId } from "@archive/domain/user/schema";
import { REPOSITORY_ERROR_CODE, RepositoryException } from "@archive/domain/shared/repository";
import type { Database } from "../db";
import { schema } from "../db";

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
  private readonly db: Database;

  constructor(bucket: R2Bucket, db: Database) {
    this.bucket = bucket;
    this.db = db;
  }

  async uploadImage(
    image: ValidatedImage,
    scope: ImageScope,
    userId: UserId,
  ): Promise<UploadImageResult> {
    const uniqueId = generateId<ImageId>();
    const extension = EXTENSION_MAP[image.contentType] ?? "";
    const prefix = buildObjectKeyPrefix(scope);
    const objectKey = `${prefix}/${uniqueId}${extension}`;

    try {
      await this.bucket.put(objectKey, image.file, {
        httpMetadata: {
          contentType: image.contentType,
        },
      });
    } catch (error) {
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "画像のアップロードに失敗しました。",
        error,
      );
    }

    try {
      await this.db.insert(schema.images).values({
        id: uniqueId,
        objectKey,
        contentType: image.contentType,
        size: image.size,
        scopeType: scope.type,
        uploadedBy: userId,
      });
    } catch (error) {
      // Rollback: delete uploaded file from R2 (best-effort, ignore errors)
      // oxlint-disable-next-line no-empty-function
      await this.bucket.delete(objectKey).catch(() => {});
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "画像のメタデータ保存に失敗しました。",
        error,
      );
    }

    return { id: uniqueId, objectKey };
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

  async migrateScope(imageId: ImageId, newScope: ImageScope): Promise<void> {
    try {
      const image = await this.db.query.images.findFirst({
        where: (images, { eq: e, and: a }) =>
          a(e(images.id, imageId), e(images.scopeType, "pending")),
      });

      if (!image) {
        return;
      }

      const filename = image.objectKey.split("/").pop();
      if (!filename) {
        return;
      }

      const newPrefix = buildObjectKeyPrefix(newScope);
      const newObjectKey = `${newPrefix}/${filename}`;

      // Move R2 object (copy + delete)
      const obj = await this.bucket.get(image.objectKey);
      if (!obj) {
        return;
      }
      await this.bucket.put(newObjectKey, await obj.arrayBuffer(), {
        httpMetadata: obj.httpMetadata,
      });
      await this.bucket.delete(image.objectKey);

      // Update DB record
      await this.db
        .update(schema.images)
        .set({
          objectKey: newObjectKey,
          scopeType: newScope.type,
        })
        .where(eq(schema.images.id, imageId));
    } catch (error) {
      if (error instanceof RepositoryException) {
        throw error;
      }
      throw new RepositoryException(
        REPOSITORY_ERROR_CODE.DATABASE_ERROR,
        "画像スコープの移行に失敗しました。",
        error,
      );
    }
  }
}
