import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { schema } from "@akabase/infrastructure/db";
import { cast } from "@akabase/domain/shared/ids";
import type { EventId } from "@akabase/domain/event/schema";
import { createTestDb } from "../../test/db-mock";
import { createTestDependencies } from "../../test/test-dependencies";
import { listExternalProjects } from "./list-external-projects";

describe("listExternalProjects", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let deps: ReturnType<typeof createTestDependencies>;
  const now = new Date();
  const eventId = cast<EventId>("event-1");

  beforeEach(async () => {
    testDb = await createTestDb();
    deps = createTestDependencies(testDb.db);

    await testDb.db.insert(schema.user).values({
      id: "user-1",
      name: "Committee User",
      email: "committee@toyo.jp",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.db.insert(schema.events).values([
      {
        id: "event-1",
        slug: "2025",
        name: "Event 2025",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "event-2",
        slug: "2024",
        name: "Event 2024",
        status: "archived",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.db.insert(schema.organizations).values([
      {
        id: "org-1",
        eventId: "event-1",
        name: "Org 1",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "org-2",
        eventId: "event-2",
        name: "Org 2",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  async function insertProject(
    id: string,
    options?: {
      name?: string;
      published?: boolean;
      eventId?: string;
      orgId?: string;
      placeId?: string;
      logoImageId?: string;
    },
  ) {
    await testDb.db.insert(schema.projects).values({
      id,
      eventId: options?.eventId ?? "event-1",
      orgId: options?.orgId ?? "org-1",
      name: options?.name ?? `企画 ${id}`,
      placeId: options?.placeId ?? null,
      logoImageId: options?.logoImageId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    if (options?.published !== false) {
      await testDb.db.insert(schema.projectPublished).values({
        projectId: id,
        pamphletText: "パンフレット用の説明",
        webContentJson: { type: "doc", content: [] },
        openingHours: "10:00-17:00",
        lastEntryTime: "16:30",
        publishedAt: now,
        publishedBy: "user-1",
      });
    }
  }

  async function insertPlaces() {
    await testDb.db.insert(schema.places).values([
      { id: "place-parent", eventId: "event-1", name: "1号館", parentId: null, createdAt: now },
      {
        id: "place-child",
        eventId: "event-1",
        name: "101教室",
        parentId: "place-parent",
        createdAt: now,
      },
      {
        id: "place-other-event",
        eventId: "event-2",
        name: "他イベントの場所",
        parentId: null,
        createdAt: now,
      },
    ]);
  }

  async function insertTags() {
    await testDb.db.insert(schema.tags).values([
      { id: "tag-1", eventId: "event-1", name: "屋内", displayOrder: 2, createdAt: now },
      { id: "tag-2", eventId: "event-1", name: "飲食", displayOrder: 1, createdAt: now },
      {
        id: "tag-other-event",
        eventId: "event-2",
        name: "他イベントのタグ",
        displayOrder: 0,
        createdAt: now,
      },
    ]);
  }

  it("公開済み企画が存在しない場合は空配列を返す", async () => {
    const result = await listExternalProjects(deps, eventId);

    expect(result).toEqual([]);
  });

  it("公開済み企画のみを返す", async () => {
    await insertProject("project-1");
    await insertProject("project-2", { published: false });

    const result = await listExternalProjects(deps, eventId);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("project-1");
    expect(result[0]!.name).toBe("企画 project-1");
    expect(result[0]!.pamphletText).toBe("パンフレット用の説明");
    expect(result[0]!.openingHours).toBe("10:00-17:00");
    expect(result[0]!.lastEntryTime).toBe("16:30");
    expect(result[0]!.organization).toEqual({ id: "org-1", name: "Org 1" });
    expect(result[0]!.publishedAt).toBeInstanceOf(Date);
  });

  it("他イベントの企画を含めない", async () => {
    await insertProject("project-1");
    await insertProject("project-other", { eventId: "event-2", orgId: "org-2" });

    const result = await listExternalProjects(deps, eventId);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("project-1");
  });

  it("企画名の昇順で返す", async () => {
    await insertProject("project-1", { name: "うどん" });
    await insertProject("project-2", { name: "あんみつ" });
    await insertProject("project-3", { name: "かき氷" });

    const result = await listExternalProjects(deps, eventId);

    expect(result.map((project) => project.name)).toEqual(["あんみつ", "うどん", "かき氷"]);
  });

  it("場所を親からのパスで返す", async () => {
    await insertPlaces();
    await insertProject("project-1", { placeId: "place-child" });

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]!.place).toEqual({
      id: "place-child",
      name: "101教室",
      path: ["1号館", "101教室"],
    });
  });

  it("場所が未設定の場合はnullを返す", async () => {
    await insertProject("project-1");

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]!.place).toBeNull();
  });

  it("他イベントの場所を参照する企画は場所をnullにする", async () => {
    await insertPlaces();
    await insertProject("project-1", { placeId: "place-other-event" });

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]!.place).toBeNull();
  });

  it("タグをdisplayOrder順に返す", async () => {
    await insertTags();
    await insertProject("project-1");
    await testDb.db.insert(schema.projectPublishedTags).values([
      { id: "pt-1", projectId: "project-1", tagId: "tag-1" },
      { id: "pt-2", projectId: "project-1", tagId: "tag-2" },
    ]);

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]!.tags).toEqual([
      { id: "tag-2", name: "飲食" },
      { id: "tag-1", name: "屋内" },
    ]);
  });

  it("他イベントのタグを含めない", async () => {
    await insertTags();
    await insertProject("project-1");
    await testDb.db.insert(schema.projectPublishedTags).values([
      { id: "pt-1", projectId: "project-1", tagId: "tag-1" },
      { id: "pt-other", projectId: "project-1", tagId: "tag-other-event" },
    ]);

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]!.tags).toEqual([{ id: "tag-1", name: "屋内" }]);
  });

  it("ロゴのURLを解決する", async () => {
    await testDb.db.insert(schema.images).values({
      id: "image-1",
      objectKey: "events/event-1/projects/project-1.webp",
      contentType: "image/webp",
      size: 1000,
      scopeType: "project",
      uploadedBy: "user-1",
      createdAt: now,
    });
    await insertProject("project-1", { logoImageId: "image-1" });

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]!.logoUrl).toContain("events/event-1/projects/project-1.webp");
  });

  it("ロゴが未設定の場合はnullを返す", async () => {
    await insertProject("project-1");

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]!.logoUrl).toBeNull();
  });

  it("一覧に本文を含めない", async () => {
    await insertProject("project-1");

    const result = await listExternalProjects(deps, eventId);

    expect(result[0]).not.toHaveProperty("webContentJson");
  });
});
