import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import { cast } from "@akabase/domain/shared/ids";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createProjectCategory } from "./create-project-category";
import { updateProjectCategory } from "./update-project-category";

describe("updateProjectCategory", () => {
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

  it("管理者が企画区分名を変更できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB教室企画");

    const result = await updateProjectCategory(deps, {
      categoryId,
      eventId,
      name: "WELLB教室企画(委員会)",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);

    const categories = await deps.eventRepo.findProjectCategories(eventId);
    const updated = categories.find((c) => c.id === categoryId);
    expect(updated?.name).toBe("WELLB教室企画(委員会)");
  });

  it("displayOrder は変更されない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await createTestCategory(eventId, "WELLB教室企画");
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");

    await updateProjectCategory(deps, { categoryId, eventId, name: "INIADホール企画", actor });

    const categories = await deps.eventRepo.findProjectCategories(eventId);
    const updated = categories.find((c) => c.id === categoryId);
    expect(updated?.displayOrder).toBe(1);
  });

  it("存在しない企画区分は変更できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updateProjectCategory(deps, {
      categoryId: cast<ProjectCategoryId>("non-existent-id"),
      eventId,
      name: "WELLB模擬店",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PROJECT_CATEGORY_NOT_FOUND");
    }
  });

  it("同じイベント内の他の企画区分と同名にはできない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await createTestCategory(eventId, "WELLB教室企画");
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");

    const result = await updateProjectCategory(deps, {
      categoryId,
      eventId,
      name: "WELLB教室企画",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PROJECT_CATEGORY_NOT_UNIQUE");
    }
  });

  it("前後の空白を除いた名前が他の企画区分と重複する場合は変更できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await createTestCategory(eventId, "WELLB教室企画");
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");

    const result = await updateProjectCategory(deps, {
      categoryId,
      eventId,
      name: "  WELLB教室企画  ",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PROJECT_CATEGORY_NOT_UNIQUE");
    }
  });

  it("同じ名前のまま更新できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");

    const result = await updateProjectCategory(deps, {
      categoryId,
      eventId,
      name: "WELLB模擬店",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("管理者以外は企画区分を変更できない", async () => {
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");
    const actor = createUserActor();

    const result = await updateProjectCategory(deps, {
      categoryId,
      eventId,
      name: "INIADホール企画",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントの企画区分は変更できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");
    await archiveEvent(deps, { eventId, actor });

    const result = await updateProjectCategory(deps, {
      categoryId,
      eventId,
      name: "INIADホール企画",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
