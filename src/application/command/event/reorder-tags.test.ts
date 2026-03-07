import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import type { EventId } from "@/domain/shared/ids";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createTag } from "./create-tag";
import { reorderTags } from "./reorder-tags";

describe("reorderTags", () => {
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

  it("管理者がタグの並び順を変更できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const r1 = await createTag(deps, { eventId, name: "飲食", actor });
    const r2 = await createTag(deps, { eventId, name: "展示", actor });
    const r3 = await createTag(deps, { eventId, name: "ステージ", actor });
    if (Result.isFailure(r1) || Result.isFailure(r2) || Result.isFailure(r3))
      throw new Error("Failed to create tags");

    // Reorder: reverse the order
    const result = await reorderTags(deps, {
      eventId,
      tagIds: [r3.value.tagId, r2.value.tagId, r1.value.tagId],
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);

    const tags = await deps.eventRepo.findTags(eventId);
    const sorted = [...tags].sort((a, b) => a.displayOrder - b.displayOrder);
    expect(sorted[0].name).toBe("ステージ");
    expect(sorted[1].name).toBe("展示");
    expect(sorted[2].name).toBe("飲食");
  });

  it("管理者以外はタグの並び順を変更できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await reorderTags(deps, {
      eventId,
      tagIds: [],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントのタグは並び替えできない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await archiveEvent(deps, { eventId, actor });

    const result = await reorderTags(deps, {
      eventId,
      tagIds: [],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });

  it("存在しないタグIDを指定するとエラーになる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await reorderTags(deps, {
      eventId,
      tagIds: ["non-existent-tag-id" as any],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("TAG_NOT_FOUND");
    }
  });

  it("すべてのタグを指定しない場合はエラーになる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const r1 = await createTag(deps, { eventId, name: "飲食", actor });
    const r2 = await createTag(deps, { eventId, name: "展示", actor });
    const r3 = await createTag(deps, { eventId, name: "ステージ", actor });
    if (Result.isFailure(r1) || Result.isFailure(r2) || Result.isFailure(r3))
      throw new Error("Failed to create tags");

    const result = await reorderTags(deps, {
      eventId,
      tagIds: [r1.value.tagId, r2.value.tagId],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("重複したタグIDを指定するとエラーになる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const r1 = await createTag(deps, { eventId, name: "飲食", actor });
    const r2 = await createTag(deps, { eventId, name: "展示", actor });
    if (Result.isFailure(r1) || Result.isFailure(r2)) throw new Error("Failed to create tags");

    const result = await reorderTags(deps, {
      eventId,
      tagIds: [r1.value.tagId, r2.value.tagId, r1.value.tagId],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
