import { eq } from "drizzle-orm";
import { Result } from "@akabase/result";
import type { ApiKeyService } from "@akabase/domain/api-key/service";
import type { ApiKeyId } from "@akabase/domain/api-key/schema";
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
      const created = await this.auth.api.createApiKey({
        body: {
          name: input.name,
          userId: input.userId,
          metadata: { eventId: input.eventId },
        },
      });

      return Result.succeed({
        id: cast<ApiKeyId>(created.id),
        key: created.key,
      });
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
}
