import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import type { EventId, TagId } from "@/domain/shared/ids";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createTag } from "./create-tag";
import { deleteTag } from "./delete-tag";

describe("deleteTag", () => {
  let testDb: ReturnType<typeof createTestDb>;
  let deps: ReturnType<typeof createTestDependencies>;

  beforeEach(() => {
    testDb = createTestDb();
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

  it("管理者がタグを削除できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const tagId = await createTestTag(eventId, "飲食");

    const result = await deleteTag(deps, { tagId, eventId, actor });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.success).toBe(true);

      const tags = await deps.eventRepo.findTags(eventId);
      expect(tags).toHaveLength(0);
    }
  });

  it("管理者以外はタグを削除できない", async () => {
    const eventId = await createActiveEvent();
    const tagId = await createTestTag(eventId, "飲食");
    const actor = createUserActor();

    const result = await deleteTag(deps, { tagId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントのタグは削除できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const tagId = await createTestTag(eventId, "飲食");
    await archiveEvent(deps, { eventId, actor });

    const result = await deleteTag(deps, { tagId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
