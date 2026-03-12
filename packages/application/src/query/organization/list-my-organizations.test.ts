import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/db-mock";
import { listMyOrganizations } from "./list-my-organizations";
import { schema } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import type { UserId } from "@archive/domain/user/schema";
import { cast } from "@archive/domain/shared/ids";
import { createUserActor } from "../../test/test-helpers";

describe("listMyOrganizations", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  const eventId = cast<EventId>("event-1");
  const userId = cast<UserId>("user-1");

  beforeEach(async () => {
    testDb = await createTestDb();

    // ユーザーを作成
    await testDb.db.insert(schema.user).values({
      id: userId,
      name: "Test User",
      email: "test@toyo.jp",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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

  it("所属する出展団体がない場合は空配列を返す", async () => {
    const actor = createUserActor(userId);
    const result = await listMyOrganizations({ db: testDb.db }, eventId, actor);

    expect(result).toEqual([]);
  });

  it("所属する出展団体の一覧を返す", async () => {
    const now = new Date();
    await testDb.db.insert(schema.organizations).values({
      id: "org-1",
      eventId,
      name: "My Organization",
      description: "",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.db.insert(schema.orgMembers).values({
      id: "member-1",
      orgId: "org-1",
      userId,
      role: "manager",
      createdAt: now,
    });

    const actor = createUserActor(userId);
    const result = await listMyOrganizations({ db: testDb.db }, eventId, actor);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("org-1");
    expect(result[0]!.name).toBe("My Organization");
    expect(result[0]!.role).toBe("manager");
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
        name: "Org in 2025",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "org-2",
        eventId: otherEventId,
        name: "Org in 2024",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(schema.orgMembers).values([
      { id: "member-1", orgId: "org-1", userId, role: "editor", createdAt: now },
      { id: "member-2", orgId: "org-2", userId, role: "manager", createdAt: now },
    ]);

    const actor = createUserActor(userId);
    const result = await listMyOrganizations({ db: testDb.db }, eventId, actor);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Org in 2025");
    expect(result[0]!.role).toBe("editor");
  });

  it("複数の出展団体に所属している場合に全て返す", async () => {
    const now = new Date();
    await testDb.db.insert(schema.organizations).values([
      {
        id: "org-1",
        eventId,
        name: "Org A",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "org-2",
        eventId,
        name: "Org B",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(schema.orgMembers).values([
      { id: "member-1", orgId: "org-1", userId, role: "manager", createdAt: now },
      { id: "member-2", orgId: "org-2", userId, role: "editor", createdAt: now },
    ]);

    const actor = createUserActor(userId);
    const result = await listMyOrganizations({ db: testDb.db }, eventId, actor);

    expect(result).toHaveLength(2);
  });
});
