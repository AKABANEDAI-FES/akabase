import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import { schema } from "@akabase/infrastructure/db";
import { cast } from "@akabase/domain/shared/ids";
import type { ApiKeyId } from "@akabase/domain/api-key/schema";
import type { EventId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createApiKey } from "./create-api-key";
import { deleteApiKey } from "./delete-api-key";

describe("deleteApiKey", () => {
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

  it("管理者がAPIキーを削除できる", async () => {
    const apiKeyId = await createTestApiKey();

    const result = await deleteApiKey(deps, {
      apiKeyId,
      actor: createAdminActor(),
    });

    expect(Result.isSuccess(result)).toBe(true);
    expect(deps.apiKeyService.getKeys()).not.toContain(apiKeyId);
  });

  it("管理者以外はAPIキーを削除できない", async () => {
    const apiKeyId = await createTestApiKey();

    const result = await deleteApiKey(deps, {
      apiKeyId,
      actor: createUserActor(),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("存在しないAPIキーは削除できない", async () => {
    const result = await deleteApiKey(deps, {
      apiKeyId: cast<ApiKeyId>("missing-key"),
      actor: createAdminActor(),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("API_KEY_NOT_FOUND");
    }
  });
});
