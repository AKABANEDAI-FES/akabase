import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";

describe("archiveEvent", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function createActiveEvent(slug = "2025") {
    const actor = createAdminActor();
    const result = await createEvent(deps, {
      name: `Test Event ${slug}`,
      slug,
      actor,
    });
    if (Result.isFailure(result)) throw new Error("Failed to create event");
    return result.value.eventId;
  }

  it("管理者がアクティブなイベントをアーカイブできる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await archiveEvent(deps, { eventId, actor });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.eventId).toBe(eventId);

      const savedEvent = await deps.eventRepo.findById(eventId);
      expect(savedEvent).not.toBeNull();
      expect(savedEvent?.status).toBe("archived");
    }
  });

  it("管理者以外はイベントをアーカイブできない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await archiveEvent(deps, { eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("存在しないイベントはアーカイブできない", async () => {
    const actor = createAdminActor();

    const result = await archiveEvent(deps, {
      eventId: "non-existent-id" as any,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_NOT_FOUND");
    }
  });

  it("既にアーカイブされたイベントはアーカイブできない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    // 一度アーカイブ
    const firstResult = await archiveEvent(deps, { eventId, actor });
    expect(Result.isSuccess(firstResult)).toBe(true);

    // 再度アーカイブを試みる
    const secondResult = await archiveEvent(deps, { eventId, actor });

    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(secondResult)) {
      expect(secondResult.error.code).toBe("EVENT_ARCHIVED");
    }
  });

  it("アーカイブ後にイベントが読み取り専用になる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    // アクティブ状態を確認
    const activeEvent = await deps.eventRepo.findById(eventId);
    expect(activeEvent?.status).toBe("active");

    // アーカイブ
    const result = await archiveEvent(deps, { eventId, actor });
    expect(Result.isSuccess(result)).toBe(true);

    // アーカイブ状態を確認
    const archivedEvent = await deps.eventRepo.findById(eventId);
    expect(archivedEvent?.status).toBe("archived");
  });
});
