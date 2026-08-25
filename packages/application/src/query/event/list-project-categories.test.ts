import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createTestDb } from "../../test/db-mock";
import { listProjectCategories } from "./list-project-categories";
import { schema } from "@akabase/infrastructure/db";
import { cast } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";

describe("listProjectCategories", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  const now = new Date();
  const eventId = cast<EventId>("event-1");

  beforeEach(async () => {
    testDb = await createTestDb();

    await testDb.db.insert(schema.events).values([
      {
        id: "event-1",
        slug: "2025",
        name: "Event 2025",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "event-2",
        slug: "2024",
        name: "Event 2024",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(schema.organizations).values([
      {
        id: "org-1",
        eventId: "event-1",
        name: "Org 1",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "org-2",
        eventId: "event-2",
        name: "Org 2",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("企画区分が存在しない場合は空配列を返す", async () => {
    const result = await listProjectCategories({ db: testDb.db }, eventId);

    expect(result).toEqual([]);
  });

  it("displayOrder の昇順で返す", async () => {
    // 挿入順, id 順, 名前順のいずれとも異なる並びにする
    await testDb.db.insert(schema.projectCategories).values([
      {
        id: "category-c",
        eventId: "event-1",
        name: "INIADホール企画",
        displayOrder: 2,
        createdAt: now,
      },
      {
        id: "category-b",
        eventId: "event-1",
        name: "WELLB模擬店",
        displayOrder: 0,
        createdAt: now,
      },
      {
        id: "category-a",
        eventId: "event-1",
        name: "WELLB教室企画",
        displayOrder: 1,
        createdAt: now,
      },
    ]);

    const result = await listProjectCategories({ db: testDb.db }, eventId);

    expect(result.map((category) => category.name)).toEqual([
      "WELLB模擬店",
      "WELLB教室企画",
      "INIADホール企画",
    ]);
  });

  it("別のイベントの企画区分は含まない", async () => {
    await testDb.db.insert(schema.projectCategories).values([
      {
        id: "category-1",
        eventId: "event-1",
        name: "WELLB教室企画",
        displayOrder: 0,
        createdAt: now,
      },
      {
        id: "category-2",
        eventId: "event-2",
        name: "INIADホール企画",
        displayOrder: 0,
        createdAt: now,
      },
    ]);

    const result = await listProjectCategories({ db: testDb.db }, eventId);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("category-1");
  });

  it("企画区分ごとに紐づく企画数を返す", async () => {
    await testDb.db.insert(schema.projectCategories).values([
      {
        id: "category-1",
        eventId: "event-1",
        name: "WELLB教室企画",
        displayOrder: 0,
        createdAt: now,
      },
      {
        id: "category-2",
        eventId: "event-1",
        name: "WELLB模擬店",
        displayOrder: 1,
        createdAt: now,
      },
    ]);

    await testDb.db.insert(schema.projects).values([
      {
        id: "project-1",
        eventId: "event-1",
        orgId: "org-1",
        name: "Project 1",
        categoryId: "category-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "project-2",
        eventId: "event-1",
        orgId: "org-1",
        name: "Project 2",
        categoryId: "category-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "project-3",
        eventId: "event-1",
        orgId: "org-1",
        name: "Project 3",
        categoryId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await listProjectCategories({ db: testDb.db }, eventId);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "category-1",
      eventId: "event-1",
      name: "WELLB教室企画",
      displayOrder: 0,
      createdAt: now,
      projectCount: 2,
    });
    expect(result[1]!.projectCount).toBe(0);
  });

  it("同じ企画区分でも別のイベントの企画は数えない", async () => {
    await testDb.db.insert(schema.projectCategories).values({
      id: "category-1",
      eventId: "event-1",
      name: "WELLB教室企画",
      displayOrder: 0,
      createdAt: now,
    });

    await testDb.db.insert(schema.projects).values([
      {
        id: "project-1",
        eventId: "event-1",
        orgId: "org-1",
        name: "Project 1",
        categoryId: "category-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "project-2",
        eventId: "event-2",
        orgId: "org-2",
        name: "Project 2",
        categoryId: "category-1",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await listProjectCategories({ db: testDb.db }, eventId);

    expect(result).toHaveLength(1);
    expect(result[0]!.projectCount).toBe(1);
  });
});
