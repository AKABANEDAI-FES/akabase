import { eq } from "drizzle-orm";
import { Result } from "@akabase/result";
import type { ApiKeyService } from "@akabase/domain/api-key/service";
import type { ApiKeyId, ApiKeyMetadata } from "@akabase/domain/api-key/schema";
import { parseApiKeyMetadata } from "@akabase/domain/api-key/logic";
import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { API_KEY_ERROR_CODE, apiKeyError } from "@akabase/domain/api-key/errors";
import { cast } from "@akabase/domain/shared/ids";
import type { Auth } from "../auth";
import { schema } from "../db";
import type { Database } from "../db";

export class ApiKeyServiceImpl implements ApiKeyService {
  private readonly auth: Auth;
  private readonly db: Database;

  constructor(auth: Auth, db: Database) {
    this.auth = auth;
    this.db = db;
  }

  async create(input: { name: string; eventId: EventId; userId: UserId }) {
    try {
      return Result.succeed(
        await this.issue({
          name: input.name,
          userId: input.userId,
          metadata: { eventId: input.eventId },
        }),
      );
    } catch {
      return Result.fail(
        apiKeyError(API_KEY_ERROR_CODE.API_KEY_CREATION_FAILED, "APIキーの作成に失敗しました"),
      );
    }
  }

  // Deletes directly from the table because better-auth's deleteApiKey is owner-only
  async delete(id: ApiKeyId) {
    try {
      const existing = await this.db.query.apikey.findFirst({
        columns: { id: true },
        where: eq(schema.apikey.id, id),
      });

      if (existing === undefined) {
        return Result.fail(
          apiKeyError(API_KEY_ERROR_CODE.API_KEY_NOT_FOUND, "APIキーが見つかりません"),
        );
      }

      await this.db.delete(schema.apikey).where(eq(schema.apikey.id, id));

      return Result.succeed(true as const);
    } catch {
      return Result.fail(
        apiKeyError(API_KEY_ERROR_CODE.API_KEY_DELETION_FAILED, "APIキーの削除に失敗しました"),
      );
    }
  }

  // Issues a new key and deletes the original, because better-auth has no API to regenerate a key
  async rotate(input: { id: ApiKeyId; userId: UserId }) {
    try {
      const existing = await this.db.query.apikey.findFirst({
        columns: { name: true, metadata: true },
        where: eq(schema.apikey.id, input.id),
      });

      if (existing === undefined) {
        return Result.fail(
          apiKeyError(API_KEY_ERROR_CODE.API_KEY_NOT_FOUND, "APIキーが見つかりません"),
        );
      }

      const metadata = parseApiKeyMetadata(existing.metadata);
      if (metadata === null) {
        return Result.fail(
          apiKeyError(
            API_KEY_ERROR_CODE.API_KEY_ROTATION_FAILED,
            "対象イベントが設定されていないため、APIキーを再発行できません",
          ),
        );
      }

      const issued = await this.issue({
        name: existing.name ?? undefined,
        userId: input.userId,
        metadata,
      });

      const revoked = await this.db
        .delete(schema.apikey)
        .where(eq(schema.apikey.id, input.id))
        .returning({ id: schema.apikey.id })
        .catch(() => null);

      // An empty result means another request deleted or rotated the original in the meantime
      if (revoked === null || revoked.length === 0) {
        await this.db.delete(schema.apikey).where(eq(schema.apikey.id, issued.id));
        return Result.fail(
          revoked === null
            ? apiKeyError(
                API_KEY_ERROR_CODE.API_KEY_ROTATION_FAILED,
                "APIキーの再発行に失敗しました",
              )
            : apiKeyError(API_KEY_ERROR_CODE.API_KEY_NOT_FOUND, "APIキーが見つかりません"),
        );
      }

      return Result.succeed(issued);
    } catch {
      return Result.fail(
        apiKeyError(API_KEY_ERROR_CODE.API_KEY_ROTATION_FAILED, "APIキーの再発行に失敗しました"),
      );
    }
  }

  private async issue(body: { name?: string; userId: UserId; metadata: ApiKeyMetadata }) {
    const created = await this.auth.api.createApiKey({ body });

    return {
      id: cast<ApiKeyId>(created.id),
      key: created.key,
    };
  }
}
