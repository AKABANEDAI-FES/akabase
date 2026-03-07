import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import type { EventId, TagId } from "@/domain/shared/ids";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createTag } from "./create-tag";
import { updateTag } from "./update-tag";

describe("updateTag", () => {
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

  async function createTestTag(eventId: EventId, name: string): Promise<TagId> {
    const actor = createAdminActor();
    const result = await createTag(deps, { eventId, name, actor });
    if (Result.isFailure(result)) throw new Error("Failed to create tag");
    return result.value.tagId;
  }

  it("管理者がタグの名前を更新できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const tagId = await createTestTag(eventId, "飲食");

    const result = await updateTag(deps, {
      tagId,
      eventId,
      name: "フード",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const tags = await deps.eventRepo.findTags(eventId);
      const updated = tags.find((t) => t.id === tagId);
      expect(updated?.name).toBe("フード");
    }
  });

  it("存在しないタグは更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updateTag(deps, {
      tagId: "non-existent-id" as any,
      eventId,
      name: "新しい名前",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("TAG_NOT_FOUND");
    }
  });

  it("同じイベント内で同名のタグに更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await createTestTag(eventId, "飲食");
    const tagId = await createTestTag(eventId, "展示");

    const result = await updateTag(deps, {
      tagId,
      eventId,
      name: "飲食",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("TAG_NOT_UNIQUE");
    }
  });

  it("自身と同じ名前での更新は許可される", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const tagId = await createTestTag(eventId, "飲食");

    const result = await updateTag(deps, {
      tagId,
      eventId,
      name: "飲食",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("管理者以外はタグを更新できない", async () => {
    const eventId = await createActiveEvent();
    const tagId = await createTestTag(eventId, "飲食");
    const actor = createUserActor();

    const result = await updateTag(deps, {
      tagId,
      eventId,
      name: "新しい名前",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントのタグは更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const tagId = await createTestTag(eventId, "飲食");
    await archiveEvent(deps, { eventId, actor });

    const result = await updateTag(deps, {
      tagId,
      eventId,
      name: "新しい名前",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
