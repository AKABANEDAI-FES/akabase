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
import { createTag } from "../event/create-tag";
import { approveProject } from "./approve-project";
import { deleteProject } from "./delete-project";
import { submitProject } from "./submit-project";

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

  it("下書き・提出履歴・公開用データも一緒に削除される", async () => {
    const actor = createAdminActor();
    const now = new Date();
    await testDb.db.insert(schema.user).values({
      id: actor.userId,
      name: "Test Admin",
      email: "test-admin@example.com",
      emailVerified: true,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    const tagResult = await createTag(deps, { eventId, name: "Tag 1", actor });
    if (Result.isFailure(tagResult)) {
      throw new Error("Failed to create tag");
    }
    await deps.projectRepo.saveDraft({
      projectId,
      pamphletText: "",
      webContentJson: null,
      openingHours: "10:00-17:00",
      updatedAt: now,
      updatedBy: actor.userId,
      tags: [tagResult.value.tagId],
    });

    const submitResult = await submitProject(deps, { projectId, actor, message: "提出します" });
    if (Result.isFailure(submitResult)) {
      throw new Error("Failed to submit project");
    }
    const approveResult = await approveProject(deps, {
      submissionId: submitResult.value.submissionId,
      actor,
      message: "承認します",
    });
    if (Result.isFailure(approveResult)) {
      throw new Error("Failed to approve project");
    }

    const relatedTables = {
      projectDrafts: schema.projectDrafts,
      projectDraftTags: schema.projectDraftTags,
      projectSubmissions: schema.projectSubmissions,
      projectSubmissionTags: schema.projectSubmissionTags,
      submissionActions: schema.submissionActions,
      submissionMessages: schema.submissionMessages,
      projectPublished: schema.projectPublished,
      projectPublishedTags: schema.projectPublishedTags,
    };
    async function countRelatedRows() {
      const counts = await Promise.all(
        Object.entries(relatedTables).map(async ([name, table]) => {
          const rows = await testDb.db.select().from(table);
          return [name, rows.length];
        }),
      );
      return Object.fromEntries(counts);
    }

    const countsBefore = await countRelatedRows();
    expect(countsBefore).toEqual({
      projectDrafts: 1,
      projectDraftTags: 1,
      projectSubmissions: 1,
      projectSubmissionTags: 1,
      submissionActions: 2,
      submissionMessages: 2,
      projectPublished: 1,
      projectPublishedTags: 1,
    });

    const result = await deleteProject(deps, { projectId, actor });

    expect(Result.isSuccess(result)).toBe(true);
    const countsAfter = await countRelatedRows();
    expect(countsAfter).toEqual({
      projectDrafts: 0,
      projectDraftTags: 0,
      projectSubmissions: 0,
      projectSubmissionTags: 0,
      submissionActions: 0,
      submissionMessages: 0,
      projectPublished: 0,
      projectPublishedTags: 0,
    });
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
