import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import { API_KEY_PREFIX } from "@akabase/infrastructure/auth";
import { schema } from "@akabase/infrastructure/db";
import { API_KEY_NAME_MAX_LENGTH } from "@akabase/domain/api-key/schema";
import { cast } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createApiKey } from "./create-api-key";

describe("createApiKey", () => {
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

  it("管理者がAPIキーを作成できる", async () => {
    const actor = createAdminActor();

    const result = await createApiKey(deps, {
      name: "学祭サイト用",
      eventId,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.apiKeyId).toBeDefined();
      expect(result.value.key.startsWith(API_KEY_PREFIX)).toBe(true);
    }
  });

  it("キー名が長すぎる場合は作成できない", async () => {
    const actor = createAdminActor();

    const result = await createApiKey(deps, {
      name: "あ".repeat(API_KEY_NAME_MAX_LENGTH + 1),
      eventId,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("管理者以外はAPIキーを作成できない", async () => {
    const actor = createUserActor();

    const result = await createApiKey(deps, {
      name: "学祭サイト用",
      eventId,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("存在しないイベントには作成できない", async () => {
    const actor = createAdminActor();

    const result = await createApiKey(deps, {
      name: "学祭サイト用",
      eventId: cast<EventId>("missing-event"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_NOT_FOUND");
    }
  });
});
