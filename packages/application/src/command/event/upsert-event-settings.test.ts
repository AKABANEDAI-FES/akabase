import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import { cast } from "@akabase/domain/shared/ids";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "./create-event";
import { archiveEvent } from "./archive-event";
import { upsertEventSettings } from "./upsert-event-settings";
import { getEventSettings } from "../../query/event/get-event-settings";

describe("upsertEventSettings", () => {
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

  it("管理者がイベント詳細設定を新規保存できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: "紹介文、注意事項の順に記載してください",
      pamphletTextMaxLength: null,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.eventId).toBe(eventId);

      const settings = await getEventSettings(deps, eventId);
      expect(settings.webContentDescription).toBe("紹介文、注意事項の順に記載してください");
    }
  });

  it("既存のイベント詳細設定を上書きできる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const firstResult = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: "初回の説明",
      pamphletTextMaxLength: null,
      actor,
    });
    expect(Result.isSuccess(firstResult)).toBe(true);

    const secondResult = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: "更新後の説明",
      pamphletTextMaxLength: null,
      actor,
    });

    expect(Result.isSuccess(secondResult)).toBe(true);
    const settings = await getEventSettings(deps, eventId);
    expect(settings.webContentDescription).toBe("更新後の説明");
  });

  it("空白のみの説明はnullとして保存される", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: "  \n  ",
      pamphletTextMaxLength: null,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    const settings = await getEventSettings(deps, eventId);
    expect(settings.webContentDescription).toBeNull();
  });

  it("nullを保存して未設定に戻せる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    await upsertEventSettings(deps, {
      eventId,
      webContentDescription: "一時的な説明",
      pamphletTextMaxLength: null,
      actor,
    });

    const result = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: null,
      pamphletTextMaxLength: null,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    const settings = await getEventSettings(deps, eventId);
    expect(settings.webContentDescription).toBeNull();
  });

  it("パンフレット用説明文の文字数制限を保存できる", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    const result = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: null,
      pamphletTextMaxLength: 100,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    const settings = await getEventSettings(deps, eventId);
    expect(settings.pamphletTextMaxLength).toBe(100);
  });

  it("管理者以外はイベント詳細設定を保存できない", async () => {
    const eventId = await createActiveEvent();
    const actor = createUserActor();

    const result = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: "説明",
      pamphletTextMaxLength: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("アーカイブされたイベントにはイベント詳細設定を保存できない", async () => {
    const actor = createAdminActor();
    const eventId = await createActiveEvent();

    await archiveEvent(deps, { eventId, actor });

    const result = await upsertEventSettings(deps, {
      eventId,
      webContentDescription: "説明",
      pamphletTextMaxLength: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_ARCHIVED");
    }
  });

  it("存在しないイベントにはイベント詳細設定を保存できない", async () => {
    const actor = createAdminActor();

    const result = await upsertEventSettings(deps, {
      eventId: cast<EventId>("non-existent-id"),
      webContentDescription: "説明",
      pamphletTextMaxLength: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("EVENT_NOT_FOUND");
    }
  });
});
