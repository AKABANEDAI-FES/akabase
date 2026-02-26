import { z } from "zod";
import {
  eventIdSchema,
  orgIdSchema,
  placeIdSchema,
  projectIdSchema,
  submissionActionIdSchema,
  submissionIdSchema,
  submissionMessageIdSchema,
  tagIdSchema,
  userIdSchema,
} from "../shared/ids";

/**
 * Schema constraints
 */
export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_PAMPHLET_TEXT_MAX_LENGTH = 120;
export const PROJECT_MAX_TAGS = 5;

/**
 * Approval constraints
 */
export const REQUIRED_APPROVALS = 1; // 必要な承認数

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
  placeId: placeIdSchema.nullable(),
  logoKey: z.string().nullable(),
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
  tags: z.array(tagIdSchema).max(PROJECT_MAX_TAGS, `タグは${PROJECT_MAX_TAGS}個まで選択できます`),
});

export type DraftWithTags = z.infer<typeof draftWithTagsSchema>;

export const submissionWithTagsSchema = projectSubmissionSchema.extend({
  tags: z.array(tagIdSchema).max(PROJECT_MAX_TAGS, `タグは${PROJECT_MAX_TAGS}個まで選択できます`),
});

export type SubmissionWithTags = z.infer<typeof submissionWithTagsSchema>;

export const publishedWithTagsSchema = projectPublishedSchema.extend({
  tags: z.array(tagIdSchema).max(PROJECT_MAX_TAGS, `タグは${PROJECT_MAX_TAGS}個まで選択できます`),
});

export type PublishedWithTags = z.infer<typeof publishedWithTagsSchema>;

/**
 * Submission Action Types
 */
export const submissionActionTypeSchema = z.enum([
  "submitted",
  "approved",
  "returned",
  "withdrawn",
]);
export type SubmissionActionType = z.infer<typeof submissionActionTypeSchema>;

/**
 * Submission action type display labels (Japanese)
 */
export const SUBMISSION_ACTION_LABELS: Record<SubmissionActionType, string> = {
  submitted: "提出",
  approved: "承認",
  returned: "差戻",
  withdrawn: "取り下げ",
} as const;

/**
 * SubmissionAction
 * 提出に対するアクション記録（提出・承認・差し戻し・取り下げ）
 */
export const submissionActionSchema = z.object({
  id: submissionActionIdSchema,
  submissionId: submissionIdSchema,
  actionType: submissionActionTypeSchema,
  userId: userIdSchema,
  createdAt: z.date(),
});

export type SubmissionAction = z.infer<typeof submissionActionSchema>;

/**
 * SubmissionMessage
 * 提出に対するメッセージ（チャット or アクションへのコメント）
 */
export const submissionMessageSchema = z.object({
  id: submissionMessageIdSchema,
  submissionId: submissionIdSchema,
  actionId: submissionActionIdSchema.nullable(), // オプショナル: 特定のアクションに紐付く場合
  userId: userIdSchema,
  message: z.string().min(1, "メッセージを入力してください"),
  createdAt: z.date(),
});

export type SubmissionMessage = z.infer<typeof submissionMessageSchema>;
