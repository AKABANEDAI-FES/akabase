import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import type { EventId, ProjectCategoryId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { cast } from "@akabase/domain/shared/ids";
import { schema } from "@akabase/infrastructure/db";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor } from "../../test/test-helpers";
import { createEvent } from "../event/create-event";
import { createProjectCategory } from "../event/create-project-category";
import { updateProject } from "./update-project";

describe("updateProject", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  const orgId = cast<OrgId>("org-1");
  const projectId = cast<ProjectId>("project-1");

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function createActiveEvent(slug = "2025"): Promise<EventId> {
    const actor = createAdminActor();
    const result = await createEvent(deps, { name: `Event ${slug}`, slug, actor });
    if (Result.isFailure(result)) {
      throw new Error("Failed to create event");
    }
    return result.value.eventId;
  }

  async function createTestCategory(eventId: EventId, name: string): Promise<ProjectCategoryId> {
    const actor = createAdminActor();
    const result = await createProjectCategory(deps, { eventId, name, actor });
    if (Result.isFailure(result)) {
      throw new Error("Failed to create project category");
    }
    return result.value.categoryId;
  }

  async function createTestProject(eventId: EventId, categoryId: ProjectCategoryId | null) {
    const now = new Date();
    await testDb.db.insert(schema.organizations).values({
      id: orgId,
      eventId,
      name: "Org 1",
      description: "",
      createdAt: now,
      updatedAt: now,
    });
    await testDb.db.insert(schema.projects).values({
      id: projectId,
      eventId,
      orgId,
      name: "Project 1",
      categoryId,
      createdAt: now,
      updatedAt: now,
    });
  }

  function updateInput(eventId: EventId, categoryId: ProjectCategoryId | null) {
    return {
      projectId,
      eventId,
      orgId,
      name: "Project 1",
      placeId: null,
      categoryId,
      logoImageId: null,
      contestVoteNumber: null,
      actor: createAdminActor(),
    };
  }

  it("企画に企画区分を設定できる", async () => {
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");
    await createTestProject(eventId, null);

    const result = await updateProject(deps, updateInput(eventId, categoryId));

    expect(Result.isSuccess(result)).toBe(true);
    const project = await deps.projectRepo.findById(projectId);
    expect(project?.categoryId).toBe(categoryId);
  });

  it("企画区分を未設定に戻せる", async () => {
    const eventId = await createActiveEvent();
    const categoryId = await createTestCategory(eventId, "WELLB模擬店");
    await createTestProject(eventId, categoryId);

    const result = await updateProject(deps, updateInput(eventId, null));

    expect(Result.isSuccess(result)).toBe(true);
    const project = await deps.projectRepo.findById(projectId);
    expect(project?.categoryId).toBeNull();
  });

  it("別のイベントの企画区分は設定できない", async () => {
    const eventId = await createActiveEvent();
    const otherEventId = await createActiveEvent("2026");
    const otherCategoryId = await createTestCategory(otherEventId, "INIADホール企画");
    await createTestProject(eventId, null);

    const result = await updateProject(deps, updateInput(eventId, otherCategoryId));

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PROJECT_CATEGORY_NOT_FOUND");
    }
    const project = await deps.projectRepo.findById(projectId);
    expect(project?.categoryId).toBeNull();
  });
});
