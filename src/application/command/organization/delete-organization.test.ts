import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { deleteOrganization } from "./delete-organization";
import { createOrganization } from "./create-organization";
import { createEvent } from "@/application/command/event/create-event";
import type { EventId, OrgId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";

describe("deleteOrganization", () => {
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
      name: "Test Organization",
      description: null,
      logoImageId: null,
      actor: createAdminActor(),
    });
    if (Result.isFailure(orgResult)) throw new Error("Failed to create organization");
    orgId = orgResult.value.organizationId;
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者が出展団体を削除できる", async () => {
    const actor = createAdminActor();

    const result = await deleteOrganization(deps, {
      eventId,
      orgId,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.eventId).toBe(eventId);

      const deletedOrg = await deps.organizationRepo.findById(eventId, orgId);
      expect(deletedOrg).toBeNull();
    }
  });

  it("一般ユーザーは出展団体を削除できない", async () => {
    const actor = createUserActor();

    const result = await deleteOrganization(deps, {
      eventId,
      orgId,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("存在しない出展団体は削除できない", async () => {
    const actor = createAdminActor();

    const result = await deleteOrganization(deps, {
      eventId,
      orgId: cast<OrgId>("non-existent-org"),
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("ORGANIZATION_NOT_FOUND");
    }
  });

  it("削除後にリストから消える", async () => {
    const actor = createAdminActor();

    const orgsBefore = await deps.organizationRepo.listByEvent(eventId);
    expect(orgsBefore).toHaveLength(1);

    await deleteOrganization(deps, { eventId, orgId, actor });

    const orgsAfter = await deps.organizationRepo.listByEvent(eventId);
    expect(orgsAfter).toHaveLength(0);
  });
});
