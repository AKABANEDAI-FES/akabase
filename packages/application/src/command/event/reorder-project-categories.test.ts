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
import { reorderProjectCategories } from "./reorder-project-categories";

describe("reorderProjectCategories", () => {
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

  it("管理者が企画区分の並び順を変更できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const r1 = await createProjectCategory(deps, { eventId, name: "WELLB教室企画", actor });
    const r2 = await createProjectCategory(deps, { eventId, name: "WELLB模擬店", actor });
    const r3 = await createProjectCategory(deps, { eventId, name: "INIADホール企画", actor });
    if (Result.isFailure(r1) || Result.isFailure(r2) || Result.isFailure(r3)) {
      throw new Error("Failed to create project categories");
    }

    // Reorder: reverse the order
    const result = await reorderProjectCategories(deps, {
      eventId,
      categoryIds: [r3.value.categoryId, r2.value.categoryId, r1.value.categoryId],
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);

    const categories = await deps.eventRepo.findProjectCategories(eventId);
    const sorted = [...categories].toSorted((a, b) => a.displayOrder - b.displayOrder);
    expect(sorted[0]!.name).toBe("INIADホール企画");
    expect(sorted[1]!.name).toBe("WELLB模擬店");
    expect(sorted[2]!.name).toBe("WELLB教室企画");
  });

  it("重複したIDを指定すると失敗する", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const r1 = await createProjectCategory(deps, { eventId, name: "WELLB教室企画", actor });
    await createProjectCategory(deps, { eventId, name: "WELLB模擬店", actor });
    if (Result.isFailure(r1)) {
      throw new Error("Failed to create project category");
    }

    const result = await reorderProjectCategories(deps, {
      eventId,
      categoryIds: [r1.value.categoryId, r1.value.categoryId],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("存在しない企画区分IDを指定すると失敗する", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await reorderProjectCategories(deps, {
      eventId,
      categoryIds: [cast<ProjectCategoryId>("non-existent-id")],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PROJECT_CATEGORY_NOT_FOUND");
    }
  });

  it("一部の企画区分だけを指定すると失敗する", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const r1 = await createProjectCategory(deps, { eventId, name: "WELLB教室企画", actor });
    await createProjectCategory(deps, { eventId, name: "WELLB模擬店", actor });
    if (Result.isFailure(r1)) {
      throw new Error("Failed to create project category");
    }

    const result = await reorderProjectCategories(deps, {
      eventId,
      categoryIds: [r1.value.categoryId],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("管理者以外は企画区分の並び順を変更できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await reorderProjectCategories(deps, {
      eventId,
      categoryIds: [],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントの企画区分は並び替えできない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await archiveEvent(deps, { eventId, actor });

    const result = await reorderProjectCategories(deps, {
      eventId,
      categoryIds: [],
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
