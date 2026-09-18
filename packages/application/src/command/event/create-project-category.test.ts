import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createProjectCategory } from "./create-project-category";

describe("createProjectCategory", () => {
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

  it("管理者がイベントに企画区分を作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await createProjectCategory(deps, {
      eventId,
      name: "WELLB教室企画",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.categoryId).toBeDefined();
      expect(result.value.eventId).toBe(eventId);

      const categories = await deps.eventRepo.findProjectCategories(eventId);
      expect(categories).toHaveLength(1);
      expect(categories[0]!.name).toBe("WELLB教室企画");
    }
  });

  it("作成順に displayOrder が振られる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    await createProjectCategory(deps, { eventId, name: "WELLB教室企画", actor });
    await createProjectCategory(deps, { eventId, name: "WELLB模擬店", actor });

    const categories = await deps.eventRepo.findProjectCategories(eventId);
    const sorted = [...categories].toSorted((a, b) => a.displayOrder - b.displayOrder);
    expect(sorted[0]!.name).toBe("WELLB教室企画");
    expect(sorted[1]!.name).toBe("WELLB模擬店");
  });

  it("同じイベント内で同名の企画区分は作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const firstResult = await createProjectCategory(deps, {
      eventId,
      name: "WELLB模擬店",
      actor,
    });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const secondResult = await createProjectCategory(deps, {
      eventId,
      name: "WELLB模擬店",
      actor,
    });

    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(secondResult)) {
      expect(secondResult.error.code).toBe("PROJECT_CATEGORY_NOT_UNIQUE");
    }
  });

  it("前後の空白を除いた名前が既存と重複する場合は作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const firstResult = await createProjectCategory(deps, {
      eventId,
      name: "WELLB模擬店",
      actor,
    });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const secondResult = await createProjectCategory(deps, {
      eventId,
      name: "  WELLB模擬店  ",
      actor,
    });

    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(secondResult)) {
      expect(secondResult.error.code).toBe("PROJECT_CATEGORY_NOT_UNIQUE");
    }
  });

  it("別のイベントであれば同名の企画区分を作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const otherEventId = await createActiveEvent("2026");

    const firstResult = await createProjectCategory(deps, { eventId, name: "WELLB模擬店", actor });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const result = await createProjectCategory(deps, {
      eventId: otherEventId,
      name: "WELLB模擬店",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    expect(await deps.eventRepo.findProjectCategories(eventId)).toHaveLength(1);
    expect(await deps.eventRepo.findProjectCategories(otherEventId)).toHaveLength(1);
  });

  it("管理者以外は企画区分を作成できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await createProjectCategory(deps, { eventId, name: "WELLB模擬店", actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントには企画区分を作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await archiveEvent(deps, { eventId, actor });

    const result = await createProjectCategory(deps, { eventId, name: "WELLB模擬店", actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
