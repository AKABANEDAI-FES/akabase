import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import type { EventId } from "@/domain/shared/ids";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createTag } from "./create-tag";

describe("createTag", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function createActiveEvent(slug = "2025"): Promise<EventId> {
    const actor = createAdminActor();
    const result = await createEvent(deps, { name: `Event ${slug}`, slug, actor });
    if (Result.isFailure(result)) throw new Error("Failed to create event");
    return result.value.eventId;
  }

  it("管理者がイベントにタグを作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await createTag(deps, {
      eventId,
      name: "飲食",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.tagId).toBeDefined();
      expect(result.value.eventId).toBe(eventId);

      const tags = await deps.eventRepo.findTags(eventId);
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("飲食");
    }
  });

  it("複数のタグを作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result1 = await createTag(deps, { eventId, name: "飲食", actor });
    const result2 = await createTag(deps, { eventId, name: "展示", actor });

    expect(Result.isSuccess(result1)).toBe(true);
    expect(Result.isSuccess(result2)).toBe(true);

    const tags = await deps.eventRepo.findTags(eventId);
    expect(tags).toHaveLength(2);
  });

  it("同じイベント内で同名のタグは作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const firstResult = await createTag(deps, { eventId, name: "飲食", actor });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const secondResult = await createTag(deps, { eventId, name: "飲食", actor });

    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(secondResult)) {
      expect(secondResult.error.code).toBe("TAG_NOT_UNIQUE");
    }
  });

  it("管理者以外はタグを作成できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await createTag(deps, { eventId, name: "飲食", actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントにはタグを作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await archiveEvent(deps, { eventId, actor });

    const result = await createTag(deps, { eventId, name: "飲食", actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
