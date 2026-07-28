import { relations, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
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
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("tags_event_id_idx").on(table.eventId),
    unique("tags_event_name_unique").on(table.eventId, table.name),
  ],
);

/**
 * Place (場所マスタ)
 * イベント単位で管理、階層構造（自己参照）
 */
export const places = sqliteTable(
  "places",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => places.id, {
      onDelete: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("places_event_id_idx").on(table.eventId),
    index("places_parent_id_idx").on(table.parentId),
    unique("places_event_parent_name_unique").on(table.eventId, table.parentId, table.name),
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
    fieldKey: text("field_key").notNull(), // E.g., "pamphlet_text", "web_content"
    startAt: integer("start_at", { mode: "timestamp_ms" }), // Nullable: optional start time
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
// Storage Context (Shared)
// ============================================================================

/**
 * Image (アップロード画像)
 * R2にアップロードされた画像のメタデータ
 */
export const images = sqliteTable("images", {
  id: text("id").primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  scopeType: text("scope_type", {
    enum: ["system", "event", "organization", "project", "pending"],
  })
    .notNull()
    .default("pending"),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ============================================================================
// Organization Context
// ============================================================================

/**
 * Organization (出展団体)
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
    logoImageId: text("logo_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
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
 * OrgMember (出展団体メンバー)
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
    placeId: text("place_id").references(() => places.id),
    logoImageId: text("logo_image_id").references(() => images.id, {
      onDelete: "set null",
    }),
    contestVoteNumber: text("contest_vote_number"),
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
    unique("projects_event_vote_number_unique").on(table.eventId, table.contestVoteNumber),
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
  pamphletText: text("pamphlet_text").notNull(), // 68文字以内
  webContentJson: text("web_content_json", { mode: "json" }), // TipTap JSON
  openingHours: text("opening_hours").notNull().default(""), // 開催時間
  lastEntryTime: text("last_entry_time").notNull().default(""), // 最終受付時間
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
    openingHours: text("opening_hours").notNull().default(""),
    lastEntryTime: text("last_entry_time").notNull().default(""),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
    submittedBy: text("submitted_by")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("project_submissions_project_id_idx").on(table.projectId),
    index("project_submissions_status_idx").on(table.status),
  ],
);

/**
 * ProjectPublished (企画の公開用データ)
 * 承認済みデータのスナップショット
 */
export const projectPublished = sqliteTable("project_published", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  pamphletText: text("pamphlet_text").notNull(),
  webContentJson: text("web_content_json", { mode: "json" }),
  openingHours: text("opening_hours").notNull().default(""),
  lastEntryTime: text("last_entry_time").notNull().default(""),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  publishedBy: text("published_by")
    .notNull()
    .references(() => user.id),
});

/**
 * SubmissionAction (提出に対するアクション)
 * 提出・承認・差し戻し・取り下げを統合管理
 */
export const submissionActions = sqliteTable(
  "submission_actions",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => projectSubmissions.id, { onDelete: "cascade" }),
    actionType: text("action_type", {
      enum: ["submitted", "approved", "returned", "withdrawn"],
    }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("submission_actions_submission_id_idx").on(table.submissionId),
    index("submission_actions_action_type_idx").on(table.actionType),
    index("submission_actions_created_at_idx").on(table.createdAt),
  ],
);

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
 * ProjectPublishedTag (公開用データのタグ)
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
// Submission Feedback Context
// ============================================================================

/**
 * SubmissionMessage (提出へのフィードバックメッセージ)
 * 提出ごとにメッセージを記録
 * actionIdが指定されている場合は特定のアクションに紐付く
 */
export const submissionMessages = sqliteTable(
  "submission_messages",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => projectSubmissions.id, { onDelete: "cascade" }),
    actionId: text("action_id").references(() => submissionActions.id, {
      onDelete: "set null",
    }), // オプショナル: 特定のアクションに紐付く場合
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    message: text("message").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("submission_messages_submission_id_idx").on(table.submissionId),
    index("submission_messages_action_id_idx").on(table.actionId),
    index("submission_messages_created_at_idx").on(table.createdAt),
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

export const placesRelations = relations(places, ({ one, many }) => ({
  event: one(events, {
    fields: [places.eventId],
    references: [events.id],
  }),
  parent: one(places, {
    fields: [places.parentId],
    references: [places.id],
    relationName: "placeHierarchy",
  }),
  children: many(places, {
    relationName: "placeHierarchy",
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

export const imagesRelations = relations(images, ({ one }) => ({
  uploadedByUser: one(user, {
    fields: [images.uploadedBy],
    references: [user.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  event: one(events, {
    fields: [organizations.eventId],
    references: [events.id],
  }),
  logoImage: one(images, {
    fields: [organizations.logoImageId],
    references: [images.id],
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
  place: one(places, {
    fields: [projects.placeId],
    references: [places.id],
  }),
  logoImage: one(images, {
    fields: [projects.logoImageId],
    references: [images.id],
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
  tags: many(projectSubmissionTags),
  actions: many(submissionActions),
  messages: many(submissionMessages),
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

export const submissionMessagesRelations = relations(submissionMessages, ({ one }) => ({
  submission: one(projectSubmissions, {
    fields: [submissionMessages.submissionId],
    references: [projectSubmissions.id],
  }),
  action: one(submissionActions, {
    fields: [submissionMessages.actionId],
    references: [submissionActions.id],
  }),
  user: one(user, {
    fields: [submissionMessages.userId],
    references: [user.id],
  }),
}));

export const submissionActionsRelations = relations(submissionActions, ({ one, many }) => ({
  submission: one(projectSubmissions, {
    fields: [submissionActions.submissionId],
    references: [projectSubmissions.id],
  }),
  user: one(user, {
    fields: [submissionActions.userId],
    references: [user.id],
  }),
  messages: many(submissionMessages),
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

// Storage Context Schemas
export const insertImageSchema = createInsertSchema(images);
export const selectImageSchema = createSelectSchema(images);

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

// Submission Feedback Schemas
export const insertSubmissionMessageSchema = createInsertSchema(submissionMessages);
export const selectSubmissionMessageSchema = createSelectSchema(submissionMessages);

export const insertSubmissionActionSchema = createInsertSchema(submissionActions);
export const selectSubmissionActionSchema = createSelectSchema(submissionActions);

// Type exports for convenience
export type InsertImage = z.infer<typeof insertImageSchema>;
export type SelectImage = z.infer<typeof selectImageSchema>;

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

export type InsertSubmissionMessage = z.infer<typeof insertSubmissionMessageSchema>;
export type SelectSubmissionMessage = z.infer<typeof selectSubmissionMessageSchema>;

export type InsertSubmissionAction = z.infer<typeof insertSubmissionActionSchema>;
export type SelectSubmissionAction = z.infer<typeof selectSubmissionActionSchema>;
