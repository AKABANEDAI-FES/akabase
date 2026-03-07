import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import type { EventId } from "@/domain/shared/ids";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createPlace } from "./create-place";

describe("createPlace", () => {
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

  it("管理者がイベントに場所を作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await createPlace(deps, {
      eventId,
      name: "メインステージ",
      parentId: null,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.placeId).toBeDefined();
      expect(result.value.eventId).toBe(eventId);

      const places = await deps.eventRepo.findPlaces(eventId);
      expect(places).toHaveLength(1);
      expect(places[0].name).toBe("メインステージ");
      expect(places[0].parentId).toBeNull();
    }
  });

  it("親場所を指定して子場所を作成できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const parentResult = await createPlace(deps, {
      eventId,
      name: "建物A",
      parentId: null,
      actor,
    });
    if (Result.isFailure(parentResult)) throw new Error("Failed to create parent place");

    const childResult = await createPlace(deps, {
      eventId,
      name: "1階",
      parentId: parentResult.value.placeId,
      actor,
    });

    expect(Result.isSuccess(childResult)).toBe(true);
    if (Result.isSuccess(childResult)) {
      const places = await deps.eventRepo.findPlaces(eventId);
      const child = places.find((p) => p.id === childResult.value.placeId);
      expect(child?.parentId).toBe(parentResult.value.placeId);
    }
  });

  it("存在しない親場所を指定すると作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await createPlace(deps, {
      eventId,
      name: "1階",
      parentId: "non-existent-id" as any,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PLACE_NOT_FOUND");
    }
  });

  it("同じ階層に同名の場所は作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const firstResult = await createPlace(deps, {
      eventId,
      name: "メインステージ",
      parentId: null,
      actor,
    });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const secondResult = await createPlace(deps, {
      eventId,
      name: "メインステージ",
      parentId: null,
      actor,
    });

    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(secondResult)) {
      expect(secondResult.error.code).toBe("PLACE_NOT_UNIQUE");
    }
  });

  it("管理者以外は場所を作成できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await createPlace(deps, {
      eventId,
      name: "メインステージ",
      parentId: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントには場所を作成できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await archiveEvent(deps, { eventId, actor });

    const result = await createPlace(deps, {
      eventId,
      name: "メインステージ",
      parentId: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
