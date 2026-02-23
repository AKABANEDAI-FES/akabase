import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { user } from "./auth-schema";

// Re-export auth schema
export * from "./auth-schema";

// ============================================================================
// Event Context (Support)
// ============================================================================

/**
 * Event (年度)
 * イベント全体の設定を管理
 */
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier (e.g., "2025")
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Tag (タグマスタ)
 * イベント単位で管理
 */
export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("tags_event_id_idx").on(table.eventId),
    unique("tags_event_slug_unique").on(table.eventId, table.slug),
  ],
);

/**
 * Place (場所マスタ)
 * イベント単位で管理
 */
export const places = sqliteTable(
  "places",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("places_event_id_idx").on(table.eventId),
    unique("places_event_slug_unique").on(table.eventId, table.slug),
  ],
);

/**
 * Deadline (締切設定)
 * フィールド単位で締切を設定
 */
export const deadlines = sqliteTable(
  "deadlines",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(), // e.g., "pamphlet_text", "web_content"
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("deadlines_event_id_idx").on(table.eventId),
    unique("deadlines_event_field_unique").on(table.eventId, table.fieldKey),
  ],
);

/**
 * CommitteeRole (委員会役割)
 * イベント単位でユーザーに役割を付与
 */
export const committeeRoles = sqliteTable(
  "committee_roles",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "approver", "member", "default"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("committee_roles_event_id_idx").on(table.eventId),
    index("committee_roles_user_id_idx").on(table.userId),
    unique("committee_roles_event_user_unique").on(table.eventId, table.userId),
  ],
);

// ============================================================================
// Organization Context
// ============================================================================

/**
 * Organization (団体)
 * イベント単位で管理
 */
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    logoKey: text("logo_key"), // R2 storage key
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("organizations_event_id_idx").on(table.eventId)],
);

/**
 * OrgMember (団体メンバー)
 * manager: 提出・メンバー管理可能
 * editor: 編集のみ可能
 */
export const orgMembers = sqliteTable(
  "org_members",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["manager", "editor"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("org_members_org_id_idx").on(table.orgId),
    index("org_members_user_id_idx").on(table.userId),
    unique("org_members_org_user_unique").on(table.orgId, table.userId),
  ],
);

// ============================================================================
// Project Context (Core - Aggregate Root)
// ============================================================================

/**
 * Project (企画)
 * 集約ルート
 */
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    placeText: text("place_text"), // フリーテキスト形式の場所情報
    logoKey: text("logo_key"), // R2 storage key
    activeSubmissionId: text("active_submission_id"), // 提出中のSubmissionID（nullable）
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("projects_event_id_idx").on(table.eventId),
    index("projects_org_id_idx").on(table.orgId),
  ],
);

/**
 * ProjectDraft (企画の下書き)
 * 編集可能な作業データ
 */
export const projectDrafts = sqliteTable("project_drafts", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  pamphletText: text("pamphlet_text").notNull(), // 120文字以内
  webContentJson: text("web_content_json", { mode: "json" }), // TipTap JSON
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => user.id),
});

/**
 * ProjectSubmission (企画の提出データ)
 * 不変なスナップショット（履歴）
 */
export const projectSubmissions = sqliteTable(
  "project_submissions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["submitted", "returned", "approved", "withdrawn"],
    })
      .notNull()
      .default("submitted"),
    pamphletText: text("pamphlet_text").notNull(),
    webContentJson: text("web_content_json", { mode: "json" }),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
    submittedBy: text("submitted_by")
      .notNull()
      .references(() => user.id),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    decidedBy: text("decided_by").references(() => user.id),
  },
  (table) => [
    index("project_submissions_project_id_idx").on(table.projectId),
    index("project_submissions_status_idx").on(table.status),
  ],
);

/**
 * ProjectPublished (企画の公開データ)
 * 承認済みデータのスナップショット
 */
export const projectPublished = sqliteTable("project_published", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  pamphletText: text("pamphlet_text").notNull(),
  webContentJson: text("web_content_json", { mode: "json" }),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  publishedBy: text("published_by")
    .notNull()
    .references(() => user.id),
});

/**
 * ProjectDraftTag (下書きのタグ)
 * 中間テーブル
 */
export const projectDraftTags = sqliteTable(
  "project_draft_tags",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projectDrafts.projectId, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("project_draft_tags_project_id_idx").on(table.projectId),
    index("project_draft_tags_tag_id_idx").on(table.tagId),
    unique("project_draft_tags_unique").on(table.projectId, table.tagId),
  ],
);

/**
 * ProjectSubmissionTag (提出データのタグ)
 * 中間テーブル
 */
export const projectSubmissionTags = sqliteTable(
  "project_submission_tags",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => projectSubmissions.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("project_submission_tags_submission_id_idx").on(table.submissionId),
    index("project_submission_tags_tag_id_idx").on(table.tagId),
    unique("project_submission_tags_unique").on(table.submissionId, table.tagId),
  ],
);

/**
 * ProjectPublishedTag (公開データのタグ)
 * 中間テーブル
 */
export const projectPublishedTags = sqliteTable(
  "project_published_tags",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projectPublished.projectId, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("project_published_tags_project_id_idx").on(table.projectId),
    index("project_published_tags_tag_id_idx").on(table.tagId),
    unique("project_published_tags_unique").on(table.projectId, table.tagId),
  ],
);

// ============================================================================
// Feedback Context
// ============================================================================

/**
 * FeedbackThread (フィードバックスレッド)
 * 企画ごとに1つのスレッド
 */
export const feedbackThreads = sqliteTable(
  "feedback_threads",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("feedback_threads_project_id_idx").on(table.projectId)],
);

/**
 * FeedbackMessage (フィードバックメッセージ)
 * スレッド内のメッセージ
 */
export const feedbackMessages = sqliteTable(
  "feedback_messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => feedbackThreads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    message: text("message").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("feedback_messages_thread_id_idx").on(table.threadId),
    index("feedback_messages_created_at_idx").on(table.createdAt),
  ],
);

// ============================================================================
// Relations
// ============================================================================

export const eventsRelations = relations(events, ({ many }) => ({
  tags: many(tags),
  places: many(places),
  deadlines: many(deadlines),
  committeeRoles: many(committeeRoles),
  organizations: many(organizations),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  event: one(events, {
    fields: [tags.eventId],
    references: [events.id],
  }),
  draftTags: many(projectDraftTags),
  submissionTags: many(projectSubmissionTags),
  publishedTags: many(projectPublishedTags),
}));

export const placesRelations = relations(places, ({ one }) => ({
  event: one(events, {
    fields: [places.eventId],
    references: [events.id],
  }),
}));

export const deadlinesRelations = relations(deadlines, ({ one }) => ({
  event: one(events, {
    fields: [deadlines.eventId],
    references: [events.id],
  }),
}));

export const committeeRolesRelations = relations(committeeRoles, ({ one }) => ({
  event: one(events, {
    fields: [committeeRoles.eventId],
    references: [events.id],
  }),
  user: one(user, {
    fields: [committeeRoles.userId],
    references: [user.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  event: one(events, {
    fields: [organizations.eventId],
    references: [events.id],
  }),
  members: many(orgMembers),
  projects: many(projects),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(user, {
    fields: [orgMembers.userId],
    references: [user.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  event: one(events, {
    fields: [projects.eventId],
    references: [events.id],
  }),
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  draft: one(projectDrafts, {
    fields: [projects.id],
    references: [projectDrafts.projectId],
  }),
  submissions: many(projectSubmissions),
  published: one(projectPublished, {
    fields: [projects.id],
    references: [projectPublished.projectId],
  }),
  feedbackThread: one(feedbackThreads, {
    fields: [projects.id],
    references: [feedbackThreads.projectId],
  }),
}));

export const projectDraftsRelations = relations(projectDrafts, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectDrafts.projectId],
    references: [projects.id],
  }),
  updatedByUser: one(user, {
    fields: [projectDrafts.updatedBy],
    references: [user.id],
  }),
  tags: many(projectDraftTags),
}));

export const projectSubmissionsRelations = relations(projectSubmissions, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectSubmissions.projectId],
    references: [projects.id],
  }),
  submittedByUser: one(user, {
    fields: [projectSubmissions.submittedBy],
    references: [user.id],
  }),
  decidedByUser: one(user, {
    fields: [projectSubmissions.decidedBy],
    references: [user.id],
  }),
  tags: many(projectSubmissionTags),
}));

export const projectPublishedRelations = relations(projectPublished, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectPublished.projectId],
    references: [projects.id],
  }),
  publishedByUser: one(user, {
    fields: [projectPublished.publishedBy],
    references: [user.id],
  }),
  tags: many(projectPublishedTags),
}));

export const projectDraftTagsRelations = relations(projectDraftTags, ({ one }) => ({
  draft: one(projectDrafts, {
    fields: [projectDraftTags.projectId],
    references: [projectDrafts.projectId],
  }),
  tag: one(tags, {
    fields: [projectDraftTags.tagId],
    references: [tags.id],
  }),
}));

export const projectSubmissionTagsRelations = relations(projectSubmissionTags, ({ one }) => ({
  submission: one(projectSubmissions, {
    fields: [projectSubmissionTags.submissionId],
    references: [projectSubmissions.id],
  }),
  tag: one(tags, {
    fields: [projectSubmissionTags.tagId],
    references: [tags.id],
  }),
}));

export const projectPublishedTagsRelations = relations(projectPublishedTags, ({ one }) => ({
  published: one(projectPublished, {
    fields: [projectPublishedTags.projectId],
    references: [projectPublished.projectId],
  }),
  tag: one(tags, {
    fields: [projectPublishedTags.tagId],
    references: [tags.id],
  }),
}));

export const feedbackThreadsRelations = relations(feedbackThreads, ({ one, many }) => ({
  project: one(projects, {
    fields: [feedbackThreads.projectId],
    references: [projects.id],
  }),
  messages: many(feedbackMessages),
}));

export const feedbackMessagesRelations = relations(feedbackMessages, ({ one }) => ({
  thread: one(feedbackThreads, {
    fields: [feedbackMessages.threadId],
    references: [feedbackThreads.id],
  }),
  user: one(user, {
    fields: [feedbackMessages.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// Zod Schemas
// ============================================================================

// Event Context Schemas
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);

export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);

export const insertPlaceSchema = createInsertSchema(places);
export const selectPlaceSchema = createSelectSchema(places);

export const insertDeadlineSchema = createInsertSchema(deadlines);
export const selectDeadlineSchema = createSelectSchema(deadlines);

export const insertCommitteeRoleSchema = createInsertSchema(committeeRoles);
export const selectCommitteeRoleSchema = createSelectSchema(committeeRoles);

// Organization Context Schemas
export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);

export const insertOrgMemberSchema = createInsertSchema(orgMembers);
export const selectOrgMemberSchema = createSelectSchema(orgMembers);

// Project Context Schemas
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);

export const insertProjectDraftSchema = createInsertSchema(projectDrafts);
export const selectProjectDraftSchema = createSelectSchema(projectDrafts);

export const insertProjectSubmissionSchema = createInsertSchema(projectSubmissions);
export const selectProjectSubmissionSchema = createSelectSchema(projectSubmissions);

export const insertProjectPublishedSchema = createInsertSchema(projectPublished);
export const selectProjectPublishedSchema = createSelectSchema(projectPublished);

export const insertProjectDraftTagSchema = createInsertSchema(projectDraftTags);
export const selectProjectDraftTagSchema = createSelectSchema(projectDraftTags);

export const insertProjectSubmissionTagSchema = createInsertSchema(projectSubmissionTags);
export const selectProjectSubmissionTagSchema = createSelectSchema(projectSubmissionTags);

export const insertProjectPublishedTagSchema = createInsertSchema(projectPublishedTags);
export const selectProjectPublishedTagSchema = createSelectSchema(projectPublishedTags);

// Feedback Context Schemas
export const insertFeedbackThreadSchema = createInsertSchema(feedbackThreads);
export const selectFeedbackThreadSchema = createSelectSchema(feedbackThreads);

export const insertFeedbackMessageSchema = createInsertSchema(feedbackMessages);
export const selectFeedbackMessageSchema = createSelectSchema(feedbackMessages);

// Type exports for convenience
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type SelectEvent = z.infer<typeof selectEventSchema>;

export type InsertTag = z.infer<typeof insertTagSchema>;
export type SelectTag = z.infer<typeof selectTagSchema>;

export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type SelectPlace = z.infer<typeof selectPlaceSchema>;

export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type SelectDeadline = z.infer<typeof selectDeadlineSchema>;

export type InsertCommitteeRole = z.infer<typeof insertCommitteeRoleSchema>;
export type SelectCommitteeRole = z.infer<typeof selectCommitteeRoleSchema>;

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type SelectOrganization = z.infer<typeof selectOrganizationSchema>;

export type InsertOrgMember = z.infer<typeof insertOrgMemberSchema>;
export type SelectOrgMember = z.infer<typeof selectOrgMemberSchema>;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type SelectProject = z.infer<typeof selectProjectSchema>;

export type InsertProjectDraft = z.infer<typeof insertProjectDraftSchema>;
export type SelectProjectDraft = z.infer<typeof selectProjectDraftSchema>;

export type InsertProjectSubmission = z.infer<typeof insertProjectSubmissionSchema>;
export type SelectProjectSubmission = z.infer<typeof selectProjectSubmissionSchema>;

export type InsertProjectPublished = z.infer<typeof insertProjectPublishedSchema>;
export type SelectProjectPublished = z.infer<typeof selectProjectPublishedSchema>;

export type InsertProjectDraftTag = z.infer<typeof insertProjectDraftTagSchema>;
export type SelectProjectDraftTag = z.infer<typeof selectProjectDraftTagSchema>;

export type InsertProjectSubmissionTag = z.infer<typeof insertProjectSubmissionTagSchema>;
export type SelectProjectSubmissionTag = z.infer<typeof selectProjectSubmissionTagSchema>;

export type InsertProjectPublishedTag = z.infer<typeof insertProjectPublishedTagSchema>;
export type SelectProjectPublishedTag = z.infer<typeof selectProjectPublishedTagSchema>;

export type InsertFeedbackThread = z.infer<typeof insertFeedbackThreadSchema>;
export type SelectFeedbackThread = z.infer<typeof selectFeedbackThreadSchema>;

export type InsertFeedbackMessage = z.infer<typeof insertFeedbackMessageSchema>;
export type SelectFeedbackMessage = z.infer<typeof selectFeedbackMessageSchema>;
