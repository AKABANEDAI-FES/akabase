import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createProjectCategory } from "./create-project-category";
import { deleteProjectCategory } from "./delete-project-category";

describe("deleteProjectCategory", () => {
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
    if (Result.isFailure(result)) {
      throw new Error("Failed to create event");
    }
    return result.value.eventId;
  }

  async function createTestCategory(eventId: EventId, name: string): Promise<ProjectCategoryId> {
    const actor = createAdminActor();
    const result = await createProjectCategory(deps, { eventId, name, actor });
    if (Result.isFailure(result)) {
      throw new Error("Failed to create project category");
    }
    return result.value.categoryId;
  }

  it("管理者が企画区分を削除できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");

    const result = await deleteProjectCategory(deps, { categoryId, eventId, actor });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.success).toBe(true);

      const categories = await deps.eventRepo.findProjectCategories(eventId);
      expect(categories).toHaveLength(0);
    }
  });

  it("他のイベントの企画区分は削除されない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const otherEventId = await createActiveEvent("2026");
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");
    await createTestCategory(otherEventId, "WELLB模擬店");

    const result = await deleteProjectCategory(deps, {
      categoryId,
      eventId: otherEventId,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    expect(await deps.eventRepo.findProjectCategories(eventId)).toHaveLength(1);
    expect(await deps.eventRepo.findProjectCategories(otherEventId)).toHaveLength(1);
  });

  it("管理者以外は企画区分を削除できない", async () => {
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");
    const actor = createUserActor();

    const result = await deleteProjectCategory(deps, { categoryId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントの企画区分は削除できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");
    await archiveEvent(deps, { eventId, actor });

    const result = await deleteProjectCategory(deps, { categoryId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
