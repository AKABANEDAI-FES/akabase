import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createTestDb } from "../../test/db-mock";
import { listOrganizations } from "./list-organizations";
import { schema } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import { cast } from "@archive/domain/shared/ids";

describe("listOrganizations", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  const eventId = cast<EventId>("event-1");

  beforeEach(async () => {
    testDb = await createTestDb();

    // イベントを作成
    await testDb.db.insert(schema.events).values({
      id: eventId,
      slug: "2025",
      name: "Test Event 2025",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("出展団体が存在しない場合は空配列を返す", async () => {
    const result = await listOrganizations({ db: testDb.db }, eventId);

    expect(result).toEqual([]);
  });

  it("イベントに属する出展団体をcreatedAt降順で返す", async () => {
    const now = new Date();
    await testDb.db.insert(schema.organizations).values([
      {
        id: "org-1",
        eventId,
        name: "Organization A",
        description: "Desc A",
        createdAt: new Date(now.getTime() - 2000),
        updatedAt: new Date(now.getTime() - 2000),
      },
      {
        id: "org-2",
        eventId,
        name: "Organization B",
        description: "Desc B",
        createdAt: new Date(now.getTime() - 1000),
        updatedAt: new Date(now.getTime() - 1000),
      },
    ]);

    const result = await listOrganizations({ db: testDb.db }, eventId);

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("org-2");
    expect(result[0]!.name).toBe("Organization B");
    expect(result[1]!.id).toBe("org-1");
    expect(result[1]!.name).toBe("Organization A");
  });

  it("他のイベントの出展団体は含まれない", async () => {
    const otherEventId = cast<EventId>("event-2");
    await testDb.db.insert(schema.events).values({
      id: otherEventId,
      slug: "2024",
      name: "Test Event 2024",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const now = new Date();
    await testDb.db.insert(schema.organizations).values([
      {
        id: "org-1",
        eventId,
        name: "Organization for 2025",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "org-2",
        eventId: otherEventId,
        name: "Organization for 2024",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await listOrganizations({ db: testDb.db }, eventId);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Organization for 2025");
  });

  it("DTOにcreatedAtとupdatedAtが含まれる", async () => {
    const now = new Date();
    await testDb.db.insert(schema.organizations).values({
      id: "org-1",
      eventId,
      name: "Test Org",
      description: "Test desc",
      createdAt: now,
      updatedAt: now,
    });

    const result = await listOrganizations({ db: testDb.db }, eventId);

    expect(result).toHaveLength(1);
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(result[0]!.updatedAt).toBeInstanceOf(Date);
    expect(result[0]!.logoImageId).toBeNull();
  });
});
