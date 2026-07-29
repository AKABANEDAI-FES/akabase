import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { schema } from "@akabase/infrastructure/db";
import { cast } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { QueryExceptionError } from "../shared";
import { listApiKeys } from "./list-api-keys";

describe("listApiKeys", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  const eventId1 = cast<EventId>("event-1");
  const eventId2 = cast<EventId>("event-2");

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function seed() {
    const now = new Date();

    await testDb.db.insert(schema.user).values({
      id: "user-1",
      name: "Test Admin",
      email: "admin@toyo.jp",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.db.insert(schema.events).values([
      {
        id: eventId1,
        slug: "2024",
        name: "Event 2024",
        status: "archived",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: eventId2,
        slug: "2025",
        name: "Event 2025",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(schema.apikey).values([
      {
        id: "key-1",
        name: "2024年用キー",
        start: "akbs_a",
        referenceId: "user-1",
        key: "hashed-key-1",
        metadata: JSON.stringify({ eventId: eventId1 }),
        createdAt: new Date(now.getTime() - 2000),
        updatedAt: now,
      },
      {
        id: "key-2",
        name: "2025年用キー",
        start: "akbs_b",
        referenceId: "user-1",
        key: "hashed-key-2",
        metadata: JSON.stringify({ eventId: eventId2 }),
        createdAt: new Date(now.getTime() - 1000),
        updatedAt: now,
      },
    ]);
  }

  it("APIキーが存在しない場合は空配列を返す", async () => {
    const result = await listApiKeys(deps, createAdminActor());

    expect(result).toEqual([]);
  });

  it("全APIキーをcreatedAt降順で返す", async () => {
    await seed();

    const result = await listApiKeys(deps, createAdminActor());

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("key-2");
    expect(result[0]!.name).toBe("2025年用キー");
    expect(result[0]!.start).toBe("akbs_b");
    expect(result[0]!.event).toEqual({ id: eventId2, name: "Event 2025" });
    expect(result[0]!.createdBy).toEqual({ id: "user-1", name: "Test Admin" });
    expect(result[0]!.createdAt).toBeInstanceOf(Date);

    expect(result[1]!.id).toBe("key-1");
    expect(result[1]!.event).toEqual({ id: eventId1, name: "Event 2024" });
  });

  it("一覧項目にキーのハッシュを含めない", async () => {
    await seed();

    const result = await listApiKeys(deps, createAdminActor());

    expect(result[0]).not.toHaveProperty("key");
  });

  it("metadataが不正な行はeventがnullになる", async () => {
    await seed();
    const now = new Date();

    await testDb.db.insert(schema.apikey).values([
      {
        id: "key-no-metadata",
        name: "metadataなし",
        referenceId: "user-1",
        key: "hashed-key-3",
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "key-broken-metadata",
        name: "壊れたmetadata",
        referenceId: "user-1",
        key: "hashed-key-4",
        metadata: "not-json",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "key-invalid-event-id",
        name: "eventIdが数値",
        referenceId: "user-1",
        key: "hashed-key-5",
        metadata: JSON.stringify({ eventId: 123 }),
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await listApiKeys(deps, createAdminActor());

    expect(result).toHaveLength(5);
    for (const id of ["key-no-metadata", "key-broken-metadata", "key-invalid-event-id"]) {
      const item = result.find((key) => key.id === id);
      expect(item).toBeDefined();
      expect(item!.event).toBeNull();
    }
  });

  it("削除済みイベントを指す行はeventがnullになる", async () => {
    await seed();
    const now = new Date();

    await testDb.db.insert(schema.apikey).values({
      id: "key-deleted-event",
      name: "削除済みイベント用キー",
      referenceId: "user-1",
      key: "hashed-key-6",
      metadata: JSON.stringify({ eventId: "missing-event" }),
      createdAt: now,
      updatedAt: now,
    });

    const result = await listApiKeys(deps, createAdminActor());

    const item = result.find((key) => key.id === "key-deleted-event");
    expect(item).toBeDefined();
    expect(item!.event).toBeNull();
  });

  it("eventIdでフィルタできる", async () => {
    await seed();

    const result = await listApiKeys(deps, createAdminActor(), { eventId: eventId1 });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("key-1");
  });

  it("フィルタ時はmetadataが不正な行を除外する", async () => {
    await seed();
    const now = new Date();

    await testDb.db.insert(schema.apikey).values({
      id: "key-no-metadata",
      name: "metadataなし",
      referenceId: "user-1",
      key: "hashed-key-3",
      metadata: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await listApiKeys(deps, createAdminActor(), { eventId: eventId1 });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("key-1");
  });

  it("フィルタに該当するキーがない場合は空配列を返す", async () => {
    await seed();

    const result = await listApiKeys(deps, createAdminActor(), {
      eventId: cast<EventId>("missing-event"),
    });

    expect(result).toEqual([]);
  });

  it("管理者以外は一覧を取得できない", async () => {
    await seed();

    await expect(listApiKeys(deps, createUserActor())).rejects.toThrow(QueryExceptionError);
  });
});
