import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { listOrganizationMembers } from "./list-organization-members";
import { events, orgMembers, organizations, user as userTable } from "@/db/schema";
import type { EventId, OrgId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { QueryException } from "../shared";

describe("listOrganizationMembers", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  const eventId = cast<EventId>("event-1");
  const orgId = cast<OrgId>("org-1");

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);

    // ユーザーを作成
    const now = new Date();
    await testDb.db.insert(userTable).values([
      {
        id: "user-1",
        name: "User One",
        email: "user1@toyo.jp",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-2",
        name: "User Two",
        email: "user2@toyo.jp",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // イベントを作成
    await testDb.db.insert(events).values({
      id: eventId,
      slug: "2025",
      name: "Test Event 2025",
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    });

    // 出展団体を作成
    await testDb.db.insert(organizations).values({
      id: orgId,
      eventId,
      name: "Test Organization",
      description: "",
      createdAt: now,
      updatedAt: now,
    });
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者がメンバー一覧を取得できる", async () => {
    const now = new Date();
    await testDb.db.insert(orgMembers).values([
      {
        id: "member-1",
        orgId,
        userId: "user-1",
        role: "manager",
        createdAt: now,
      },
      {
        id: "member-2",
        orgId,
        userId: "user-2",
        role: "editor",
        createdAt: now,
      },
    ]);

    const actor = createAdminActor();
    const result = await listOrganizationMembers(
      { db: testDb.db, authService: deps.authService },
      eventId,
      orgId,
      actor,
    );

    expect(result).toHaveLength(2);
    const member1 = result.find((m) => m.userId === "user-1");
    const member2 = result.find((m) => m.userId === "user-2");

    expect(member1).toBeDefined();
    expect(member1?.name).toBe("User One");
    expect(member1?.email).toBe("user1@toyo.jp");
    expect(member1?.role).toBe("manager");

    expect(member2).toBeDefined();
    expect(member2?.name).toBe("User Two");
    expect(member2?.role).toBe("editor");
  });

  it("メンバーがいない場合は空配列を返す", async () => {
    const actor = createAdminActor();
    const result = await listOrganizationMembers(
      { db: testDb.db, authService: deps.authService },
      eventId,
      orgId,
      actor,
    );

    expect(result).toEqual([]);
  });

  it("権限のないユーザーはQueryExceptionがスローされる", async () => {
    const actor = createUserActor();

    await expect(
      listOrganizationMembers(
        { db: testDb.db, authService: deps.authService },
        eventId,
        orgId,
        actor,
      ),
    ).rejects.toThrow(QueryException);
  });

  it("DTOにcreatedAtが含まれる", async () => {
    const now = new Date();
    await testDb.db.insert(orgMembers).values({
      id: "member-1",
      orgId,
      userId: "user-1",
      role: "manager",
      createdAt: now,
    });

    const actor = createAdminActor();
    const result = await listOrganizationMembers(
      { db: testDb.db, authService: deps.authService },
      eventId,
      orgId,
      actor,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(result[0]!.id).toBeDefined();
    expect(result[0]!.userId).toBe("user-1");
  });
});
