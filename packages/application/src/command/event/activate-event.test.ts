import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { activateEvent } from "./activate-event";

describe("activateEvent", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function createArchivedEvent() {
    const actor = createAdminActor();
    const createResult = await createEvent(deps, {
      name: "Test Event 2025",
      slug: "2025",
      actor,
    });
    if (Result.isFailure(createResult)) {
      throw new Error("Failed to create event");
    }

    const archiveResult = await archiveEvent(deps, {
      eventId: createResult.value.eventId,
      actor,
    });
    if (Result.isFailure(archiveResult)) {
      throw new Error("Failed to archive event");
    }

    return createResult.value.eventId;
  }

  it("管理者がアーカイブされたイベントを有効化できる", async () => {
    const actor = createAdminActor();
    const eventId = await createArchivedEvent();

    const result = await activateEvent(deps, { eventId, actor });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.eventId).toBe(eventId);

      const savedEvent = await deps.eventRepo.findById(eventId);
      expect(savedEvent).not.toBeNull();
      expect(savedEvent?.status).toBe("active");
    }
  });

  it("管理者以外はイベントを有効化できない", async () => {
    const eventId = await createArchivedEvent();
    const actor = createUserActor();

    const result = await activateEvent(deps, { eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("存在しないイベントは有効化できない", async () => {
    const actor = createAdminActor();

    const result = await activateEvent(deps, {
      eventId: "non-existent-id" as any,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_NOT_FOUND");
    }
  });

  it("既にアクティブなイベントは有効化できない", async () => {
    const actor = createAdminActor();
    const createResult = await createEvent(deps, {
      name: "Active Event",
      slug: "2025",
      actor,
    });
    if (Result.isFailure(createResult)) {
      throw new Error("Failed to create event");
    }

    const result = await activateEvent(deps, {
      eventId: createResult.value.eventId,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ALREADY_ACTIVE");
    }
  });

  it("有効化後にイベントが編集可能になる", async () => {
    const actor = createAdminActor();
    const eventId = await createArchivedEvent();

    // アーカイブ状態を確認
    const archivedEvent = await deps.eventRepo.findById(eventId);
    expect(archivedEvent?.status).toBe("archived");

    // 有効化
    const result = await activateEvent(deps, { eventId, actor });
    expect(Result.isSuccess(result)).toBe(true);

    // アクティブ状態を確認
    const activatedEvent = await deps.eventRepo.findById(eventId);
    expect(activatedEvent?.status).toBe("active");
  });
});
