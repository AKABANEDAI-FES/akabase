import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/db-mock";
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";
import { getSubmissionStats } from "./get-submission-stats";
import { events, organizations, projectSubmissions, projects, user } from "@/db/schema";
import { cast } from "@/domain/shared/ids";
import type { EventId } from "@/domain/shared/ids";

describe("getSubmissionStats", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  const now = new Date();
  const eventId = cast<EventId>("event-1");

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);

    await testDb.db.insert(user).values({
      id: "committee-user",
      name: "Committee User",
      email: "committee@toyo.jp",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.db.insert(events).values({
      id: "event-1",
      slug: "2025",
      name: "Test Event",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.db.insert(organizations).values({
      id: "org-1",
      eventId: "event-1",
      name: "Test Org",
      description: "",
      createdAt: now,
      updatedAt: now,
    });
  });

  afterEach(() => {
    testDb.cleanup();
  });

  function createCommitteeActor(userId = "committee-user") {
    const actor = createAdminActor(userId);
    actor.committeeRoles.set(eventId, "admin");
    return actor;
  }

  it("提出がない場合、全て0を返す", async () => {
    const actor = createCommitteeActor();

    const result = await getSubmissionStats(deps, eventId, actor);

    expect(result).toEqual({
      submitted: 0,
      approved: 0,
      returned: 0,
      withdrawn: 0,
    });
  });

  it("各ステータスの企画が混在する場合、正しくカウントされる", async () => {
    await testDb.db.insert(projects).values([
      {
        id: "proj-1",
        eventId: "event-1",
        orgId: "org-1",
        name: "Submitted",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "proj-2",
        eventId: "event-1",
        orgId: "org-1",
        name: "Approved",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "proj-3",
        eventId: "event-1",
        orgId: "org-1",
        name: "Returned",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "proj-4",
        eventId: "event-1",
        orgId: "org-1",
        name: "No submission",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(projectSubmissions).values([
      {
        id: "sub-1",
        projectId: "proj-1",
        status: "submitted",
        pamphletText: "",
        submittedAt: now,
        submittedBy: "committee-user",
      },
      {
        id: "sub-2",
        projectId: "proj-2",
        status: "approved",
        pamphletText: "",
        submittedAt: now,
        submittedBy: "committee-user",
      },
      {
        id: "sub-3",
        projectId: "proj-3",
        status: "returned",
        pamphletText: "",
        submittedAt: now,
        submittedBy: "committee-user",
      },
    ]);

    const actor = createCommitteeActor();
    const result = await getSubmissionStats(deps, eventId, actor);

    expect(result).toEqual({
      submitted: 1,
      approved: 1,
      returned: 1,
      withdrawn: 0,
    });
  });

  it("withdrawnの最新提出はwithdrawnとしてカウントされる", async () => {
    await testDb.db.insert(projects).values([
      {
        id: "proj-1",
        eventId: "event-1",
        orgId: "org-1",
        name: "Withdrawn",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(projectSubmissions).values([
      {
        id: "sub-1",
        projectId: "proj-1",
        status: "withdrawn",
        pamphletText: "",
        submittedAt: now,
        submittedBy: "committee-user",
      },
    ]);

    const actor = createCommitteeActor();
    const result = await getSubmissionStats(deps, eventId, actor);

    expect(result).toEqual({
      submitted: 0,
      approved: 0,
      returned: 0,
      withdrawn: 1,
    });
  });

  it("複数回提出がある場合、最新の提出のステータスのみがカウントされる", async () => {
    await testDb.db.insert(projects).values([
      {
        id: "proj-1",
        eventId: "event-1",
        orgId: "org-1",
        name: "Multiple submissions",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(projectSubmissions).values([
      {
        id: "sub-1",
        projectId: "proj-1",
        status: "returned",
        pamphletText: "",
        submittedAt: new Date(now.getTime() - 10000),
        submittedBy: "committee-user",
      },
      {
        id: "sub-2",
        projectId: "proj-1",
        status: "submitted",
        pamphletText: "",
        submittedAt: now,
        submittedBy: "committee-user",
      },
    ]);

    const actor = createCommitteeActor();
    const result = await getSubmissionStats(deps, eventId, actor);

    expect(result).toEqual({
      submitted: 1,
      approved: 0,
      returned: 0,
      withdrawn: 0,
    });
  });

  it("権限がないユーザーはQueryExceptionが発生する", async () => {
    const actor = createUserActor();

    await expect(getSubmissionStats(deps, eventId, actor)).rejects.toThrow();
  });

  it("別イベントの企画はカウントに含まれない", async () => {
    await testDb.db.insert(events).values({
      id: "event-2",
      slug: "2024",
      name: "Other Event",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.db.insert(organizations).values({
      id: "org-2",
      eventId: "event-2",
      name: "Other Org",
      description: "",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.db.insert(projects).values([
      {
        id: "proj-1",
        eventId: "event-1",
        orgId: "org-1",
        name: "This event",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "proj-2",
        eventId: "event-2",
        orgId: "org-2",
        name: "Other event",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(projectSubmissions).values([
      {
        id: "sub-1",
        projectId: "proj-1",
        status: "submitted",
        pamphletText: "",
        submittedAt: now,
        submittedBy: "committee-user",
      },
      {
        id: "sub-2",
        projectId: "proj-2",
        status: "approved",
        pamphletText: "",
        submittedAt: now,
        submittedBy: "committee-user",
      },
    ]);

    const actor = createCommitteeActor();
    const result = await getSubmissionStats(deps, eventId, actor);

    expect(result).toEqual({
      submitted: 1,
      approved: 0,
      returned: 0,
      withdrawn: 0,
    });
  });
});
