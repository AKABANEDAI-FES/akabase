import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createTestDb } from "../../test/db-mock";
import { listEvents } from "./list-events";
import { schema } from "@archive/infrastructure/db";

describe("listEvents", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("イベントが存在しない場合は空配列を返す", async () => {
    const result = await listEvents({ db: testDb.db });

    expect(result).toEqual([]);
  });

  it("全イベントをcreatedAt降順で返す", async () => {
    const now = new Date();
    await testDb.db.insert(schema.events).values([
      {
        id: "event-1",
        slug: "2024",
        name: "Event 2024",
        status: "archived" as const,
        createdAt: new Date(now.getTime() - 2000),
        updatedAt: new Date(),
      },
      {
        id: "event-2",
        slug: "2025",
        name: "Event 2025",
        status: "active" as const,
        createdAt: new Date(now.getTime() - 1000),
        updatedAt: new Date(),
      },
    ]);

    const result = await listEvents({ db: testDb.db });

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("event-2");
    expect(result[0]!.name).toBe("Event 2025");
    expect(result[0]!.slug).toBe("2025");
    expect(result[0]!.status).toBe("active");

    expect(result[1]!.id).toBe("event-1");
    expect(result[1]!.name).toBe("Event 2024");
    expect(result[1]!.status).toBe("archived");
  });

  it("createdAtがDate型にパースされる", async () => {
    const now = new Date();
    await testDb.db.insert(schema.events).values({
      id: "event-3",
      slug: "2026",
      name: "Event 2026",
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    });

    const result = await listEvents({ db: testDb.db });

    expect(result).toHaveLength(1);
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(Math.abs(result[0]!.createdAt.getTime() - now.getTime())).toBeLessThan(1000);
  });

  it("DTOにはupdatedAtが含まれない", async () => {
    const now = new Date();
    await testDb.db.insert(schema.events).values({
      id: "event-4",
      slug: "2025",
      name: "Event 2025",
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    });

    const result = await listEvents({ db: testDb.db });

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0]!)).toEqual(
      expect.arrayContaining(["id", "name", "slug", "status", "createdAt"]),
    );
    expect(result[0]).not.toHaveProperty("updatedAt");
  });
});
