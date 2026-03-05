import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { getOrganizationDetail } from "./get-organization-detail";
import { events, organizations } from "@/db/schema";
import type { EventId, OrgId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";
import { createAdminActor, createUserActor } from "@/test/test-helpers";

describe("getOrganizationDetail", () => {
  let testDb: ReturnType<typeof createTestDb>;
  let deps: ReturnType<typeof createTestDependencies>;
  const eventId = cast<EventId>("event-1");
  const orgId = cast<OrgId>("org-1");

  beforeEach(async () => {
    testDb = createTestDb();
    deps = createTestDependencies(testDb.db);

    // イベントを作成
    await testDb.db.insert(events).values({
      id: eventId,
      slug: "2025",
      name: "Test Event 2025",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 出展団体を作成
    const now = new Date();
    await testDb.db.insert(organizations).values({
      id: orgId,
      eventId,
      name: "Test Organization",
      description: "Test description",
      createdAt: now,
      updatedAt: now,
    });
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者が出展団体の詳細を取得できる", async () => {
    const actor = createAdminActor();

    const result = await getOrganizationDetail(
      { db: testDb.db, authService: deps.authService },
      eventId,
      orgId,
      actor,
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe(orgId);
    expect(result?.eventId).toBe(eventId);
    expect(result?.name).toBe("Test Organization");
    expect(result?.description).toBe("Test description");
    expect(result?.logoImageId).toBeNull();
    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.updatedAt).toBeInstanceOf(Date);
  });

  it("存在しない出展団体はnullを返す", async () => {
    const actor = createAdminActor();

    const result = await getOrganizationDetail(
      { db: testDb.db, authService: deps.authService },
      eventId,
      cast<OrgId>("non-existent-org"),
      actor,
    );

    expect(result).toBeNull();
  });

  it("権限のないユーザーにはnullを返す", async () => {
    const actor = createUserActor();

    const result = await getOrganizationDetail(
      { db: testDb.db, authService: deps.authService },
      eventId,
      orgId,
      actor,
    );

    expect(result).toBeNull();
  });

  it("別のイベントのorgIdでは取得できない", async () => {
    const actor = createAdminActor();
    const otherEventId = cast<EventId>("event-2");

    await testDb.db.insert(events).values({
      id: otherEventId,
      slug: "2024",
      name: "Test Event 2024",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getOrganizationDetail(
      { db: testDb.db, authService: deps.authService },
      otherEventId,
      orgId,
      actor,
    );

    expect(result).toBeNull();
  });
});
