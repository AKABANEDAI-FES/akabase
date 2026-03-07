import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Result } from "@praha/byethrow";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { createOrganization } from "./create-organization";
import { createEvent } from "@/application/command/event/create-event";
import type { EventId } from "@/domain/shared/ids";
import { cast } from "@/domain/shared/ids";

describe("createOrganization", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  let eventId: EventId;

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);

    // イベントを事前作成
    const eventResult = await createEvent(deps, {
      name: "Test Event 2025",
      slug: "2025",
      actor: createAdminActor(),
    });
    if (Result.isFailure(eventResult)) throw new Error("Failed to create event");
    eventId = eventResult.value.eventId;
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者が出展団体を作成できる", async () => {
    const actor = createAdminActor();

    const result = await createOrganization(deps, {
      eventId,
      name: "Test Organization",
      description: "A test organization",
      logoImageId: null,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.organizationId).toBeDefined();
      expect(result.value.eventId).toBe(eventId);

      const savedOrg = await deps.organizationRepo.findById(eventId, result.value.organizationId);
      expect(savedOrg).not.toBeNull();
      expect(savedOrg?.name).toBe("Test Organization");
      expect(savedOrg?.description).toBe("A test organization");
    }
  });

  it("descriptionがnullの場合は空文字で保存される", async () => {
    const actor = createAdminActor();

    const result = await createOrganization(deps, {
      eventId,
      name: "Test Organization",
      description: null,
      logoImageId: null,
      actor,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const savedOrg = await deps.organizationRepo.findById(eventId, result.value.organizationId);
      expect(savedOrg?.description).toBe("");
    }
  });

  it("一般ユーザーは出展団体を作成できない", async () => {
    const actor = createUserActor();

    const result = await createOrganization(deps, {
      eventId,
      name: "Test Organization",
      description: null,
      logoImageId: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("空の名前では作成できない", async () => {
    const actor = createAdminActor();

    const result = await createOrganization(deps, {
      eventId,
      name: "",
      description: null,
      logoImageId: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("101文字以上の名前では作成できない", async () => {
    const actor = createAdminActor();

    const result = await createOrganization(deps, {
      eventId,
      name: "a".repeat(101),
      description: null,
      logoImageId: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("101文字以上のdescriptionでは作成できない", async () => {
    const actor = createAdminActor();

    const result = await createOrganization(deps, {
      eventId,
      name: "Test Organization",
      description: "a".repeat(101),
      logoImageId: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("存在しないイベントIDでは作成できない", async () => {
    const actor = createAdminActor();

    const result = await createOrganization(deps, {
      eventId: cast<EventId>("non-existent-event"),
      name: "Test Organization",
      description: null,
      logoImageId: null,
      actor,
    });

    expect(Result.isFailure(result)).toBe(true);
  });

  it("同じイベントに複数の出展団体を作成できる", async () => {
    const actor = createAdminActor();

    const result1 = await createOrganization(deps, {
      eventId,
      name: "Organization A",
      description: null,
      logoImageId: null,
      actor,
    });

    const result2 = await createOrganization(deps, {
      eventId,
      name: "Organization B",
      description: null,
      logoImageId: null,
      actor,
    });

    expect(Result.isSuccess(result1)).toBe(true);
    expect(Result.isSuccess(result2)).toBe(true);

    const orgs = await deps.organizationRepo.listByEvent(eventId);
    expect(orgs).toHaveLength(2);
  });
});
