import { z } from "zod";
import type { EventId, OrgId, ProjectId, SubmissionId, TagId, UserId } from "../shared/ids";

/**
 * Project (Aggregate Root)
 * 企画の集約ルート
 */
export const projectSchema = z.object({
  id: z.custom<ProjectId>(),
  eventId: z.custom<EventId>(),
  orgId: z.custom<OrgId>(),
  name: z.string(),
  placeText: z.string().nullable(),
  logoKey: z.string().nullable(),
  activeSubmissionId: z.custom<SubmissionId>().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof projectSchema>;

/**
 * ProjectDraft
 * 編集可能な作業データ
 */
export const projectDraftSchema = z.object({
  projectId: z.custom<ProjectId>(),
  pamphletText: z.string().max(120).nullable(),
  webContentJson: z.json().nullable(), // TipTap JSON
  updatedAt: z.date(),
  updatedBy: z.custom<UserId>(),
});

export type ProjectDraft = z.infer<typeof projectDraftSchema>;

/**
 * ProjectSubmission Status
 */
export const submissionStatusSchema = z.enum(["submitted", "returned", "approved", "withdrawn"]);

export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

/**
 * ProjectSubmission
 * 不変なスナップショット（履歴）
 */
export const projectSubmissionSchema = z.object({
  id: z.custom<SubmissionId>(),
  projectId: z.custom<ProjectId>(),
  status: submissionStatusSchema,
  pamphletText: z.string().nullable(),
  webContentJson: z.json().nullable(),
  submittedAt: z.date(),
  submittedBy: z.custom<UserId>(),
  decidedAt: z.date().nullable(),
  decidedBy: z.custom<UserId>().nullable(),
});

export type ProjectSubmission = z.infer<typeof projectSubmissionSchema>;

/**
 * ProjectPublished
 * 承認済みデータのスナップショット
 */
export const projectPublishedSchema = z.object({
  projectId: z.custom<ProjectId>(),
  pamphletText: z.string().nullable(),
  webContentJson: z.json().nullable(),
  publishedAt: z.date(),
  publishedBy: z.custom<UserId>(),
});

export type ProjectPublished = z.infer<typeof projectPublishedSchema>;

/**
 * Composite types with tags
 */

export const draftWithTagsSchema = projectDraftSchema.extend({
  tags: z.array(z.custom<TagId>()),
});

export type DraftWithTags = z.infer<typeof draftWithTagsSchema>;

export const submissionWithTagsSchema = projectSubmissionSchema.extend({
  tags: z.array(z.custom<TagId>()),
});

export type SubmissionWithTags = z.infer<typeof submissionWithTagsSchema>;

export const publishedWithTagsSchema = projectPublishedSchema.extend({
  tags: z.array(z.custom<TagId>()),
});

export type PublishedWithTags = z.infer<typeof publishedWithTagsSchema>;
