import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@archive/result";
import type { EventId } from "@archive/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { updateEvent } from "./update-event";

describe("updateEvent", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function createActiveEvent(slug = "2025", name = `Event ${slug}`): Promise<EventId> {
    const actor = createAdminActor();
    const result = await createEvent(deps, { name, slug, actor });
    if (Result.isFailure(result)) {
      throw new Error("Failed to create event");
    }
    return result.value.eventId;
  }

  it("管理者がイベントを更新できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updateEvent(deps, {
      eventId,
      name: "Updated Event",
      slug: "2025",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const savedEvent = await deps.eventRepo.findById(eventId);
      expect(savedEvent?.name).toBe("Updated Event");
    }
  });

  it("スラッグを変更できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updateEvent(deps, {
      eventId,
      name: "Event 2025",
      slug: "2025-summer",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const savedEvent = await deps.eventRepo.findById(eventId);
      expect(savedEvent?.slug).toBe("2025-summer");
    }
  });

  it("他のイベントと同じスラッグには変更できない", async () => {
    const actor = createAdminActor();
    await createActiveEvent("2024");
    const eventId = await createActiveEvent("2025");

    const result = await updateEvent(deps, {
      eventId,
      name: "Event",
      slug: "2024",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("SLUG_NOT_UNIQUE");
    }
  });

  it("自身と同じスラッグは許可される", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updateEvent(deps, {
      eventId,
      name: "Updated Name",
      slug: "2025",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("管理者以外はイベントを更新できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await updateEvent(deps, {
      eventId,
      name: "Updated",
      slug: "2025",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントは更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await archiveEvent(deps, { eventId, actor });

    const result = await updateEvent(deps, {
      eventId,
      name: "Updated",
      slug: "2025",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });

  it("空のイベント名では更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updateEvent(deps, {
      eventId,
      name: "",
      slug: "2025",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
