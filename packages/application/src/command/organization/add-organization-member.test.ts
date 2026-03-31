import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@archive/result";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { addOrganizationMember } from "./add-organization-member";
import { createOrganization } from "./create-organization";
import { createEvent } from "../event/create-event";
import { schema } from "@archive/infrastructure/db";
import type { EventId } from "@archive/domain/event/schema";
import type { OrgId } from "@archive/domain/organization/schema";
import type { UserId } from "@archive/domain/user/schema";
import { cast } from "@archive/domain/shared/ids";

describe("addOrganizationMember", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  let eventId: EventId;
  let orgId: OrgId;
  const testUserId = cast<UserId>("test-member-user");
  const testUserEmail = "member@toyo.jp";

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);

    // イベントを作成
    const eventResult = await createEvent(deps, {
      name: "Test Event 2025",
      slug: "2025",
      actor: createAdminActor(),
    });
    if (Result.isFailure(eventResult)) {
      throw new Error("Failed to create event");
    }
    ({ eventId } = eventResult.value);

    // 出展団体を作成
    const orgResult = await createOrganization(deps, {
      eventId,
      name: "Test Organization",
      description: null,
      logoImageId: null,
      actor: createAdminActor(),
    });
    if (Result.isFailure(orgResult)) {
      throw new Error("Failed to create organization");
    }
    orgId = orgResult.value.organizationId;

    // テストユーザーをDBに作成
    await testDb.db.insert(schema.user).values({
      id: testUserId,
      name: "Test Member",
      email: testUserEmail,
      emailVerified: true,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者がメンバーを追加できる", async () => {
    const actor = createAdminActor();

    const result = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "editor",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.orgId).toBe(orgId);
      expect(result.value.eventId).toBe(eventId);
      expect(result.value.user.email).toBe(testUserEmail);

      const members = await deps.organizationRepo.findMembers(orgId);
      expect(members).toHaveLength(1);
      expect(members[0]!.userId).toBe(testUserId);
      expect(members[0]!.role).toBe("editor");
    }
  });

  it("managerロールでメンバーを追加できる", async () => {
    const actor = createAdminActor();

    const result = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "manager",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const members = await deps.organizationRepo.findMembers(orgId);
      expect(members[0]!.role).toBe("manager");
    }
  });

  it("一般ユーザーはメンバーを追加できない", async () => {
    const actor = createUserActor();

    const result = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "editor",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("存在しないメールアドレスのユーザーは追加できない", async () => {
    const actor = createAdminActor();

    const result = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: "nonexistent@toyo.jp",
      role: "editor",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("USER_NOT_FOUND");
    }
  });

  it("既にメンバーのユーザーは追加できない", async () => {
    const actor = createAdminActor();

    // 1回目: 追加成功
    const first = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "editor",
      actor,
    });
    expect(Result.isSuccess(first)).toBe(true);

    // 2回目: 重複エラー
    const second = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "editor",
      actor,
    });

    expect(Result.isFailure(second)).toBe(true);
    if (Result.isFailure(second)) {
      expect(second.error.code).toBe("USER_ALREADY_MEMBER");
    }
  });

  it("存在しない出展団体にはメンバーを追加できない", async () => {
    const actor = createAdminActor();

    const result = await addOrganizationMember(deps, {
      eventId,
      orgId: cast<OrgId>("non-existent-org"),
      email: testUserEmail,
      role: "editor",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("ORGANIZATION_NOT_FOUND");
    }
  });
});
