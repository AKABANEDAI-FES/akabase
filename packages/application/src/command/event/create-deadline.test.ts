import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@archive/result";
import type { EventId } from "@archive/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createDeadline } from "./create-deadline";

describe("createDeadline", () => {
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
    const result = await createEvent(deps, {
      name: `Test Event ${slug}`,
      slug,
      actor,
    });
    if (Result.isFailure(result)) {
      throw new Error("Failed to create event");
    }
    return result.value.eventId;
  }

  it("管理者がイベントに締切を作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2025-12-31"),
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.deadlineId).toBeDefined();
      expect(result.value.eventId).toBe(eventId);

      const deadlines = await deps.eventRepo.findDeadlines(eventId);
      expect(deadlines).toHaveLength(1);
      expect(deadlines[0]!.fieldKey).toBe("pamphlet_text");
    }
  });

  it("開始日時付きの締切を作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await createDeadline(deps, {
      eventId,
      fieldKey: "web_content",
      startAt: new Date("2025-06-01"),
      deadlineAt: new Date("2025-12-31"),
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const deadlines = await deps.eventRepo.findDeadlines(eventId);
      expect(deadlines).toHaveLength(1);
      expect(deadlines[0]!.startAt).toEqual(new Date("2025-06-01"));
      expect(deadlines[0]!.deadlineAt).toEqual(new Date("2025-12-31"));
    }
  });

  it("異なるフィールドキーで複数の締切を作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result1 = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2025-11-30"),
      actor,
    });
    const result2 = await createDeadline(deps, {
      eventId,
      fieldKey: "web_content",
      deadlineAt: new Date("2025-12-31"),
      actor,
    });

    expect(Result.isSuccess(result1)).toBe(true);
    expect(Result.isSuccess(result2)).toBe(true);

    const deadlines = await deps.eventRepo.findDeadlines(eventId);
    expect(deadlines).toHaveLength(2);
  });

  it("同じフィールドキーの締切は重複作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const firstResult = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2025-12-31"),
      actor,
    });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const secondResult = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2026-01-31"),
      actor,
    });

    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(secondResult)) {
      expect(secondResult.error.code).toBe("DEADLINE_ALREADY_EXISTS");
    }
  });

  it("管理者以外は締切を作成できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2025-12-31"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントには締切を作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    await archiveEvent(deps, { eventId, actor });

    const result = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2025-12-31"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });

  it("開始日時が締切日時より後の場合は作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      startAt: new Date("2026-01-01"),
      deadlineAt: new Date("2025-12-31"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
