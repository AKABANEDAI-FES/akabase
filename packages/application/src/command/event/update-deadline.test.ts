import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import type { DeadlineId, EventId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createDeadline } from "./create-deadline";
import { updateDeadline } from "./update-deadline";

describe("updateDeadline", () => {
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

  async function createTestDeadline(eventId: EventId): Promise<DeadlineId> {
    const actor = createAdminActor();
    const result = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2025-12-31"),
      actor,
    });
    if (Result.isFailure(result)) {
      throw new Error("Failed to create deadline");
    }
    return result.value.deadlineId;
  }

  it("管理者が締切を更新できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);

    const result = await updateDeadline(deps, {
      deadlineId,
      eventId,
      deadlineAt: new Date("2026-01-31"),
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const deadlines = await deps.eventRepo.findDeadlines(eventId);
      const updated = deadlines.find((d) => d.id === deadlineId);
      expect(updated?.deadlineAt).toEqual(new Date("2026-01-31"));
    }
  });

  it("開始日時を追加できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);

    const result = await updateDeadline(deps, {
      deadlineId,
      eventId,
      startAt: new Date("2025-06-01"),
      deadlineAt: new Date("2025-12-31"),
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const deadlines = await deps.eventRepo.findDeadlines(eventId);
      const updated = deadlines.find((d) => d.id === deadlineId);
      expect(updated?.startAt).toEqual(new Date("2025-06-01"));
    }
  });

  it("存在しない締切は更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updateDeadline(deps, {
      deadlineId: "non-existent-id" as any,
      eventId,
      deadlineAt: new Date("2026-01-31"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("DEADLINE_NOT_FOUND");
    }
  });

  it("開始日時が締切日時より後の場合は更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);

    const result = await updateDeadline(deps, {
      deadlineId,
      eventId,
      startAt: new Date("2026-02-01"),
      deadlineAt: new Date("2026-01-31"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("管理者以外は締切を更新できない", async () => {
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);
    const actor = createUserActor();

    const result = await updateDeadline(deps, {
      deadlineId,
      eventId,
      deadlineAt: new Date("2026-01-31"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントの締切は更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);
    await archiveEvent(deps, { eventId, actor });

    const result = await updateDeadline(deps, {
      deadlineId,
      eventId,
      deadlineAt: new Date("2026-01-31"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
