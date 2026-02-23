import { z } from "zod";
import {
  eventIdSchema,
  orgIdSchema,
  projectIdSchema,
  submissionIdSchema,
  tagIdSchema,
  userIdSchema,
} from "../shared/ids";

/**
 * Schema constraints
 */
export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_PLACE_TEXT_MAX_LENGTH = 100;
export const PROJECT_PAMPHLET_TEXT_MAX_LENGTH = 120;

/**
 * Project (Aggregate Root)
 * 企画の集約ルート
 */
export const projectSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z
    .string()
    .min(PROJECT_NAME_MIN_LENGTH, "企画名を入力してください")
    .max(PROJECT_NAME_MAX_LENGTH, "企画名は100文字以内で入力してください"),
  placeText: z
    .string()
    .max(PROJECT_PLACE_TEXT_MAX_LENGTH, "場所は100文字以内で入力してください")
    .nullable(),
  logoKey: z.string().nullable(),
  activeSubmissionId: submissionIdSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof projectSchema>;

/**
 * ProjectDraft
 * 編集可能な作業データ
 */
export const projectDraftSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: z
    .string()
    .max(PROJECT_PAMPHLET_TEXT_MAX_LENGTH, "パンフレットテキストは120文字以内で入力してください"),
  webContentJson: z.json().nullable(), // TipTap JSON
  updatedAt: z.date(),
  updatedBy: userIdSchema,
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
  id: submissionIdSchema,
  projectId: projectIdSchema,
  status: submissionStatusSchema,
  pamphletText: z
    .string()
    .max(PROJECT_PAMPHLET_TEXT_MAX_LENGTH, "パンフレットテキストは120文字以内で入力してください"),
  webContentJson: z.json().nullable(),
  submittedAt: z.date(),
  submittedBy: userIdSchema,
  decidedAt: z.date().nullable(),
  decidedBy: userIdSchema.nullable(),
});

export type ProjectSubmission = z.infer<typeof projectSubmissionSchema>;

/**
 * ProjectPublished
 * 承認済みデータのスナップショット
 */
export const projectPublishedSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: z
    .string()
    .max(PROJECT_PAMPHLET_TEXT_MAX_LENGTH, "パンフレットテキストは120文字以内で入力してください"),
  webContentJson: z.json().nullable(),
  publishedAt: z.date(),
  publishedBy: userIdSchema,
});

export type ProjectPublished = z.infer<typeof projectPublishedSchema>;

/**
 * Composite types with tags
 */

export const draftWithTagsSchema = projectDraftSchema.extend({
  tags: z.array(tagIdSchema),
});

export type DraftWithTags = z.infer<typeof draftWithTagsSchema>;

export const submissionWithTagsSchema = projectSubmissionSchema.extend({
  tags: z.array(tagIdSchema),
});

export type SubmissionWithTags = z.infer<typeof submissionWithTagsSchema>;

export const publishedWithTagsSchema = projectPublishedSchema.extend({
  tags: z.array(tagIdSchema),
});

export type PublishedWithTags = z.infer<typeof publishedWithTagsSchema>;
