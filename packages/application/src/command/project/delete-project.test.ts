import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Result } from "@akabase/result";
import type { EventId } from "@akabase/domain/event/schema";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { ProjectId } from "@akabase/domain/project/schema";
import { cast } from "@akabase/domain/shared/ids";
import { schema } from "@akabase/infrastructure/db";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { createAdminActor, createUserActor } from "../../test/test-helpers";
import { createEvent } from "../event/create-event";
import { deleteProject } from "./delete-project";

describe("deleteProject", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  let eventId: EventId;
  const orgId = cast<OrgId>("org-1");
  const projectId = cast<ProjectId>("project-1");

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
      createdAt: now,
      updatedAt: now,
    });
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it("管理者が企画を削除できる", async () => {
    const result = await deleteProject(deps, { projectId, actor: createAdminActor() });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({ projectId, eventId, orgId });
    }

    const deleted = await deps.projectRepo.findById(projectId);
    expect(deleted).toBeNull();
    const projects = await deps.projectRepo.listByOrganization(orgId);
    expect(projects).toHaveLength(0);
  });

  it("企画の下書きも一緒に削除される", async () => {
    const now = new Date();
    await testDb.db.insert(schema.user).values({
      id: "draft-author",
      name: "Draft Author",
      email: "draft-author@example.com",
      emailVerified: true,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });
    await testDb.db.insert(schema.projectDrafts).values({
      projectId,
      pamphletText: "",
      updatedBy: "draft-author",
    });

    const result = await deleteProject(deps, { projectId, actor: createAdminActor() });

    expect(Result.isSuccess(result)).toBe(true);
    const draft = await deps.projectRepo.findDraftWithTags(projectId);
    expect(draft).toBeNull();
  });

  it("一般ユーザーは企画を削除できない", async () => {
    const result = await deleteProject(deps, { projectId, actor: createUserActor() });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }

    const project = await deps.projectRepo.findById(projectId);
    expect(project).not.toBeNull();
  });

  it("存在しない企画は削除できない", async () => {
    const result = await deleteProject(deps, {
      projectId: cast<ProjectId>("non-existent-project"),
      actor: createAdminActor(),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("PROJECT_NOT_FOUND");
    }
  });
});
