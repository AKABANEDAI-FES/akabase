import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import type { DeadlineId, EventId } from "@/domain/shared/ids";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createDeadline } from "./create-deadline";
import { deleteDeadline } from "./delete-deadline";

describe("deleteDeadline", () => {
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

  async function createTestDeadline(eventId: EventId): Promise<DeadlineId> {
    const actor = createAdminActor();
    const result = await createDeadline(deps, {
      eventId,
      fieldKey: "pamphlet_text",
      deadlineAt: new Date("2025-12-31"),
      actor,
    });
    if (Result.isFailure(result)) throw new Error("Failed to create deadline");
    return result.value.deadlineId;
  }

  it("管理者が締切を削除できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);

    const result = await deleteDeadline(deps, { deadlineId, eventId, actor });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.success).toBe(true);

      const deadlines = await deps.eventRepo.findDeadlines(eventId);
      expect(deadlines).toHaveLength(0);
    }
  });

  it("管理者以外は締切を削除できない", async () => {
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);
    const actor = createUserActor();

    const result = await deleteDeadline(deps, { deadlineId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントの締切は削除できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const deadlineId = await createTestDeadline(eventId);
    await archiveEvent(deps, { eventId, actor });

    const result = await deleteDeadline(deps, { deadlineId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
