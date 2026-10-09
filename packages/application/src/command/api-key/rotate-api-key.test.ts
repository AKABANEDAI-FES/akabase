import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import { API_KEY_PREFIX } from "@akabase/infrastructure/auth";
import { schema } from "@akabase/infrastructure/db";
import { cast } from "@akabase/domain/shared/ids";
import type { ApiKeyId } from "@akabase/domain/api-key/schema";
import type { EventId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createApiKey } from "./create-api-key";
import { rotateApiKey } from "./rotate-api-key";

describe("rotateApiKey", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  const eventId = cast<EventId>("event-1");

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);

    await testDb.db.insert(schema.events).values({
      id: eventId,
      slug: "2025",
      name: "Event 2025",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function createTestApiKey(): Promise<ApiKeyId> {
    const result = await createApiKey(deps, {
      name: "学祭サイト用",
      eventId,
      actor: createAdminActor(),
    });

    if (Result.isFailure(result)) {
      throw new Error("Failed to create test API key");
    }

    return result.value.apiKeyId;
  }

  it("管理者がAPIキーを再発行でき、元のキーは削除される", async () => {
    const apiKeyId = await createTestApiKey();

    const result = await rotateApiKey(deps, {
      apiKeyId,
      actor: createAdminActor(),
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.apiKeyId).not.toBe(apiKeyId);
      expect(result.value.key.startsWith(API_KEY_PREFIX)).toBe(true);
      expect(deps.apiKeyService.getKeys()).toEqual([result.value.apiKeyId]);
    }
  });

  it("管理者以外はAPIキーを再発行できない", async () => {
    const apiKeyId = await createTestApiKey();

    const result = await rotateApiKey(deps, {
      apiKeyId,
      actor: createUserActor(),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(deps.apiKeyService.getKeys()).toEqual([apiKeyId]);
  });

  it("存在しないAPIキーは再発行できない", async () => {
    const result = await rotateApiKey(deps, {
      apiKeyId: cast<ApiKeyId>("missing-key"),
      actor: createAdminActor(),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("API_KEY_NOT_FOUND");
    }
  });
});
