import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { updateOrganization } from "./update-organization";
import { createOrganization } from "./create-organization";
import { createEvent } from "@/application/command/event/create-event";
import type { EventId, OrgId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";

describe("updateOrganization", () => {
  let testDb: ReturnType<typeof createTestDb>;
  let deps: ReturnType<typeof createTestDependencies>;
  let eventId: EventId;
  let orgId: OrgId;

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
      name: "Original Name",
      description: "Original Description",
      logoImageId: null,
      actor: createAdminActor(),
    });
    if (Result.isFailure(orgResult)) throw new Error("Failed to create organization");
    orgId = orgResult.value.organizationId;
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者が出展団体を更新できる", async () => {
    const actor = createAdminActor();

    const result = await updateOrganization(deps, {
      eventId,
      orgId,
      name: "Updated Name",
      description: "Updated Description",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const savedOrg = await deps.organizationRepo.findById(eventId, orgId);
      expect(savedOrg?.name).toBe("Updated Name");
      expect(savedOrg?.description).toBe("Updated Description");
    }
  });

  it("一般ユーザーは出展団体を更新できない", async () => {
    const actor = createUserActor();

    const result = await updateOrganization(deps, {
      eventId,
      orgId,
      name: "Updated Name",
      description: "Updated Description",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("存在しない出展団体は更新できない", async () => {
    const actor = createAdminActor();

    const result = await updateOrganization(deps, {
      eventId,
      orgId: cast<OrgId>("non-existent-org"),
      name: "Updated Name",
      description: "Updated Description",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("ORGANIZATION_NOT_FOUND");
    }
  });

  it("空の名前では更新できない", async () => {
    const actor = createAdminActor();

    const result = await updateOrganization(deps, {
      eventId,
      orgId,
      name: "",
      description: "Updated Description",
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("101文字以上のdescriptionでは更新できない", async () => {
    const actor = createAdminActor();

    const result = await updateOrganization(deps, {
      eventId,
      orgId,
      name: "Updated Name",
      description: "a".repeat(101),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("updatedAtが更新される", async () => {
    const actor = createAdminActor();

    const orgBefore = await deps.organizationRepo.findById(eventId, orgId);

    const result = await updateOrganization(deps, {
      eventId,
      orgId,
      name: "Updated Name",
      description: "Updated Description",
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    const orgAfter = await deps.organizationRepo.findById(eventId, orgId);
    expect(orgAfter!.updatedAt.getTime()).toBeGreaterThanOrEqual(orgBefore!.updatedAt.getTime());
  });
});
