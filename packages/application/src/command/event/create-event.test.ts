import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";

describe("createEvent", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者がイベントを作成できる", async () => {
    const actor = createAdminActor();

    const result = await createEvent(deps, {
      name: "Test Event 2025",
      slug: "2025",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.eventId).toBeDefined();
      expect(typeof result.value.eventId).toBe("string");

      const savedEvent = await deps.eventRepo.findBySlug("2025");
      expect(savedEvent).not.toBeNull();
      expect(savedEvent?.name).toBe("Test Event 2025");
      expect(savedEvent?.slug).toBe("2025");
      expect(savedEvent?.status).toBe("active");
    }
  });

  it("異なるスラッグで複数のイベントを作成できる", async () => {
    const actor = createAdminActor();

    const result1 = await createEvent(deps, {
      name: "Event 2024",
      slug: "2024",
      actor,
    });

    const result2 = await createEvent(deps, {
      name: "Event 2025",
      slug: "2025",
      actor,
    });

    expect(Result.isSuccess(result1)).toBe(true);
    expect(Result.isSuccess(result2)).toBe(true);

    const event1 = await deps.eventRepo.findBySlug("2024");
    const event2 = await deps.eventRepo.findBySlug("2025");

    expect(event1).not.toBeNull();
    expect(event2).not.toBeNull();
    expect(event1?.slug).toBe("2024");
    expect(event2?.slug).toBe("2025");
  });

  it("管理者以外はイベントを作成できない", async () => {
    const actor = createUserActor();

    const result = await createEvent(deps, {
      name: "Test Event 2025",
      slug: "2025",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("同じスラッグのイベントは作成できない", async () => {
    const actor = createAdminActor();

    const firstResult = await createEvent(deps, {
      name: "First Event",
      slug: "2025",
      actor,
    });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const secondResult = await createEvent(deps, {
      name: "Second Event",
      slug: "2025",
      actor,
    });

    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(secondResult)) {
      expect(secondResult.error.code).toBe("SLUG_NOT_UNIQUE");
    }
  });

  it("空のイベント名では作成できない", async () => {
    const actor = createAdminActor();

    const result = await createEvent(deps, {
      name: "",
      slug: "2025",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("101文字以上のイベント名では作成できない", async () => {
    const actor = createAdminActor();

    const result = await createEvent(deps, {
      name: "a".repeat(101),
      slug: "2025",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("空のスラッグでは作成できない", async () => {
    const actor = createAdminActor();

    const result = await createEvent(deps, {
      name: "Test Event",
      slug: "",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("不正な形式のスラッグでは作成できない", async () => {
    const actor = createAdminActor();

    const result = await createEvent(deps, {
      name: "Test Event",
      slug: "INVALID SLUG!",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
