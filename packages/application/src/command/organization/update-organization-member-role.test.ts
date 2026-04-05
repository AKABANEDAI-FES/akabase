import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { updateOrganizationMemberRole } from "./update-organization-member-role";
import { addOrganizationMember } from "./add-organization-member";
import { createOrganization } from "./create-organization";
import { createEvent } from "../event/create-event";
import { schema } from "@akabase/infrastructure/db";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { cast } from "@akabase/domain/shared/ids";

describe("updateOrganizationMemberRole", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  let eventId: EventId;
  let orgId: OrgId;
  const testUserId = cast<UserId>("test-member-user");
  const testUserEmail = "member@toyo.jp";

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);

    const eventResult = await createEvent(deps, {
      name: "Test Event 2025",
      slug: "2025",
      actor: createAdminActor(),
    });
    if (Result.isFailure(eventResult)) {
      throw new Error("Failed to create event");
    }
    ({ eventId } = eventResult.value);

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

    // editorとして追加
    const addResult = await addOrganizationMember(deps, {
      eventId,
      orgId,
      email: testUserEmail,
      role: "editor",
      actor: createAdminActor(),
    });
    if (Result.isFailure(addResult)) {
      throw new Error("Failed to add member");
    }
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者がメンバーのロールをmanagerに更新できる", async () => {
    const actor = createAdminActor();

    const result = await updateOrganizationMemberRole(deps, {
      eventId,
      orgId,
      userId: testUserId,
      role: "manager",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const members = await deps.organizationRepo.findMembers(orgId);
      const member = members.find((m) => m.userId === testUserId);
      expect(member?.role).toBe("manager");
    }
  });

  it("managerからeditorにロールを変更できる", async () => {
    const actor = createAdminActor();

    // まずmanagerに昇格
    await updateOrganizationMemberRole(deps, {
      eventId,
      orgId,
      userId: testUserId,
      role: "manager",
      actor,
    });

    // editorに変更
    const result = await updateOrganizationMemberRole(deps, {
      eventId,
      orgId,
      userId: testUserId,
      role: "editor",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const members = await deps.organizationRepo.findMembers(orgId);
      const member = members.find((m) => m.userId === testUserId);
      expect(member?.role).toBe("editor");
    }
  });

  it("一般ユーザーはロールを更新できない", async () => {
    const actor = createUserActor();

    const result = await updateOrganizationMemberRole(deps, {
      eventId,
      orgId,
      userId: testUserId,
      role: "manager",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("メンバーでないユーザーのロールは更新できない", async () => {
    const actor = createAdminActor();

    const result = await updateOrganizationMemberRole(deps, {
      eventId,
      orgId,
      userId: cast<UserId>("non-existent-user"),
      role: "manager",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("USER_NOT_MEMBER");
    }
  });

  it("存在しない出展団体のメンバーロールは更新できない", async () => {
    const actor = createAdminActor();

    const result = await updateOrganizationMemberRole(deps, {
      eventId,
      orgId: cast<OrgId>("non-existent-org"),
      userId: testUserId,
      role: "manager",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("ORGANIZATION_NOT_FOUND");
    }
  });
});
