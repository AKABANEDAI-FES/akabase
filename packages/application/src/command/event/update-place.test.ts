import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@archive/result";
import type { EventId, PlaceId } from "@archive/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createPlace } from "./create-place";
import { updatePlace } from "./update-place";

describe("updatePlace", () => {
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

  async function createTestPlace(
    eventId: EventId,
    name: string,
    parentId: PlaceId | null = null,
  ): Promise<PlaceId> {
    const actor = createAdminActor();
    const result = await createPlace(deps, { eventId, name, parentId, actor });
    if (Result.isFailure(result)) {
      throw new Error("Failed to create place");
    }
    return result.value.placeId;
  }

  it("管理者が場所の名前を更新できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const placeId = await createTestPlace(eventId, "メインステージ");

    const result = await updatePlace(deps, {
      placeId,
      eventId,
      name: "サブステージ",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const places = await deps.eventRepo.findPlaces(eventId);
      const updated = places.find((p) => p.id === placeId);
      expect(updated?.name).toBe("サブステージ");
    }
  });

  it("存在しない場所は更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await updatePlace(deps, {
      placeId: "non-existent-id" as any,
      eventId,
      name: "新しい名前",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PLACE_NOT_FOUND");
    }
  });

  it("同じ階層に同名の場所に更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    await createTestPlace(eventId, "ステージA");
    const placeId = await createTestPlace(eventId, "ステージB");

    const result = await updatePlace(deps, {
      placeId,
      eventId,
      name: "ステージA",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PLACE_NOT_UNIQUE");
    }
  });

  it("自身と同じ名前での更新は許可される", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const placeId = await createTestPlace(eventId, "メインステージ");

    const result = await updatePlace(deps, {
      placeId,
      eventId,
      name: "メインステージ",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("管理者以外は場所を更新できない", async () => {
    const eventId = await createActiveEvent();
    const placeId = await createTestPlace(eventId, "メインステージ");
    const actor = createUserActor();

    const result = await updatePlace(deps, {
      placeId,
      eventId,
      name: "新しい名前",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントの場所は更新できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const placeId = await createTestPlace(eventId, "メインステージ");
    await archiveEvent(deps, { eventId, actor });

    const result = await updatePlace(deps, {
      placeId,
      eventId,
      name: "新しい名前",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
