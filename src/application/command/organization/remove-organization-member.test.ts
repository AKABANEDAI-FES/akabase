import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { removeOrganizationMember } from "./remove-organization-member";
import { addOrganizationMember } from "./add-organization-member";
import { createOrganization } from "./create-organization";
import { createEvent } from "@/application/command/event/create-event";
import { user as userTable } from "@/db/schema";
import type { EventId, OrgId, UserId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";

describe("removeOrganizationMember", () => {
  let testDb: ReturnType<typeof createTestDb>;
  let deps: ReturnType<typeof createTestDependencies>;
  let eventId: EventId;
  let orgId: OrgId;
  const testUserId = cast<UserId>("test-member-user");
  const testUserEmail = "member@toyo.jp";

  beforeEach(async () => {
    testDb = createTestDb();
    deps = createTestDependencies(testDb.db);

    const eventResult = await createEvent(deps, {
      name: "Test Event 2025",
      slug: "2025",
      actor: createAdminActor(),
    });
    if (Result.isFailure(eventResult)) throw new Error("Failed to create event");
    eventId = eventResult.value.eventId;

    const orgResult = await createOrganization(deps, {
      eventId,
      name: "Test Organization",
      description: null,
      logoImageId: null,
      actor: createAdminActor(),
    });
    if (Result.isFailure(orgResult)) throw new Error("Failed to create organization");
    orgId = orgResult.value.organizationId;

    // テストユーザーをDBに作成
    await testDb.db.insert(userTable).values({
      id: testUserId,
      name: "Test Member",
      email: testUserEmail,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // メンバーとして追加
    const addResult = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "editor",
      actor: createAdminActor(),
    });
    if (Result.isFailure(addResult)) throw new Error("Failed to add member");
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者がメンバーを削除できる", async () => {
    const actor = createAdminActor();

    const result = await removeOrganizationMember(deps, {
      eventId,
      orgId,
      userId: testUserId,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.orgId).toBe(orgId);
      expect(result.value.eventId).toBe(eventId);

      const members = await deps.organizationRepo.findMembers(orgId);
      expect(members).toHaveLength(0);
    }
  });

  it("一般ユーザーはメンバーを削除できない", async () => {
    const actor = createUserActor();

    const result = await removeOrganizationMember(deps, {
      eventId,
      orgId,
      userId: testUserId,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("メンバーでないユーザーは削除できない", async () => {
    const actor = createAdminActor();

    const result = await removeOrganizationMember(deps, {
      eventId,
      orgId,
      userId: cast<UserId>("non-existent-user"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("USER_NOT_MEMBER");
    }
  });

  it("存在しない出展団体からはメンバーを削除できない", async () => {
    const actor = createAdminActor();

    const result = await removeOrganizationMember(deps, {
      eventId,
      orgId: cast<OrgId>("non-existent-org"),
      userId: testUserId,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("ORGANIZATION_NOT_FOUND");
    }
  });

  it("削除後に再度追加できる", async () => {
    const actor = createAdminActor();

    // 削除
    const removeResult = await removeOrganizationMember(deps, {
      eventId,
      orgId,
      userId: testUserId,
      actor,
    });
    expect(Result.isSuccess(removeResult)).toBe(true);

    // 再追加
    const addResult = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "manager",
      actor,
    });
    expect(Result.isSuccess(addResult)).toBe(true);

    const members = await deps.organizationRepo.findMembers(orgId);
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("manager");
  });
});
