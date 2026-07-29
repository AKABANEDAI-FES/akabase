import { Result } from "@akabase/result";
import { API_KEY_PREFIX } from "@akabase/infrastructure/auth";
import { generateId } from "@akabase/domain/shared/ids";
import type { ApiKeyService } from "@akabase/domain/api-key/service";
import type { ApiKeyId } from "@akabase/domain/api-key/schema";
import { API_KEY_ERROR_CODE, apiKeyError } from "@akabase/domain/api-key/errors";
import type { EventId } from "@akabase/domain/event/schema";
import type { UserId } from "@akabase/domain/user/schema";

export class MockApiKeyService implements ApiKeyService {
  private readonly keys = new Map<
    ApiKeyId,
    { name: string; eventId: EventId; userId: UserId; key: string }
  >();

  async create(input: { name: string; eventId: EventId; userId: UserId }) {
    const id = generateId<ApiKeyId>();
    const key = `${API_KEY_PREFIX}${id}`;

    this.keys.set(id, { ...input, key });

    return Result.succeed({ id, key });
  }

  async delete(id: ApiKeyId) {
    if (!this.keys.has(id)) {
      return Result.fail(
        apiKeyError(API_KEY_ERROR_CODE.API_KEY_NOT_FOUND, "APIキーが見つかりません"),
      );
    }

    this.keys.delete(id);

    return Result.succeed(true as const);
  }

  getKeys(): ApiKeyId[] {
    return [...this.keys.keys()];
  }

  clear(): void {
    this.keys.clear();
  }
}
