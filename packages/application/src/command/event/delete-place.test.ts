import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@archive/result";
import type { EventId, PlaceId } from "@archive/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { createPlace } from "./create-place";
import { deletePlace } from "./delete-place";

describe("deletePlace", () => {
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

  it("管理者が場所を削除できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const placeId = await createTestPlace(eventId, "メインステージ");

    const result = await deletePlace(deps, { placeId, eventId, actor });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.success).toBe(true);

      const places = await deps.eventRepo.findPlaces(eventId);
      expect(places).toHaveLength(0);
    }
  });

  it("管理者以外は場所を削除できない", async () => {
    const eventId = await createActiveEvent();
    const placeId = await createTestPlace(eventId, "メインステージ");
    const actor = createUserActor();

    const result = await deletePlace(deps, { placeId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントの場所は削除できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();
    const placeId = await createTestPlace(eventId, "メインステージ");
    await archiveEvent(deps, { eventId, actor });

    const result = await deletePlace(deps, { placeId, eventId, actor });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });
});
