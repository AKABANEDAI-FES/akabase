import { z } from "zod";
import { eventIdSchema, placeIdSchema, tagIdSchema } from "../event/schema";
import { orgIdSchema } from "../organization/schema";
import { imageIdSchema } from "../shared/image";
import { userIdSchema } from "../user/schema";

export const projectIdSchema = z.string().brand<"ProjectId">();
export type ProjectId = z.infer<typeof projectIdSchema>;

export const submissionIdSchema = z.string().brand<"SubmissionId">();
export type SubmissionId = z.infer<typeof submissionIdSchema>;

export const submissionActionIdSchema = z.string().brand<"SubmissionActionId">();
export type SubmissionActionId = z.infer<typeof submissionActionIdSchema>;

export const submissionMessageIdSchema = z.string().brand<"SubmissionMessageId">();
export type SubmissionMessageId = z.infer<typeof submissionMessageIdSchema>;

/**
 * Schema constraints
 */
export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_PAMPHLET_TEXT_DEFAULT_MAX_LENGTH = 68;
export const PROJECT_DETAIL_INFO_MAX_LENGTH = 100;
export const PROJECT_MAX_TAGS = 5;
export const CONTEST_VOTE_NUMBER_PATTERN = /^[0-9]{4}$/;
export const SUBMISSION_MESSAGE_MIN_LENGTH = 1;
export const SUBMISSION_MESSAGE_MAX_LENGTH = 200;

/**
 * Resolve the effective pamphlet text max length from event settings
 */
export function resolvePamphletTextMaxLength(
  settings: { pamphletTextMaxLength: number | null } | null,
): number {
  return settings?.pamphletTextMaxLength ?? PROJECT_PAMPHLET_TEXT_DEFAULT_MAX_LENGTH;
}

/**
 * Generate the error message for pamphlet text exceeding the max length
 */
export function pamphletTextMaxLengthMessage(maxLength: number): string {
  return `パンフレットテキストは${maxLength}文字以内で入力してください`;
}

/**
 * Generate the pamphlet text validation schema for a per-event max length
 */
export function pamphletTextSchema(maxLength: number) {
  return z.string().max(maxLength, pamphletTextMaxLengthMessage(maxLength));
}

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
  logoImageId: imageIdSchema.nullable(),
  contestVoteNumber: z
    .string()
    .regex(CONTEST_VOTE_NUMBER_PATTERN, "投票番号は4桁の数字で入力してください")
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof projectSchema>;

/**
 * 企画詳細情報（開催時間・最終受付時間）
 * Draft では任意、Submission / Published では必須
 */
const detailInfoShape = {
  openingHours: z
    .string()
    .max(
      PROJECT_DETAIL_INFO_MAX_LENGTH,
      `開催時間は${PROJECT_DETAIL_INFO_MAX_LENGTH}文字以内で入力してください`,
    ),
  lastEntryTime: z
    .string()
    .max(
      PROJECT_DETAIL_INFO_MAX_LENGTH,
      `最終受付時間は${PROJECT_DETAIL_INFO_MAX_LENGTH}文字以内で入力してください`,
    ),
};

const requiredDetailInfoShape = {
  openingHours: detailInfoShape.openingHours.min(1, "開催時間を入力してください"),
  lastEntryTime: detailInfoShape.lastEntryTime.min(1, "最終受付時間を入力してください"),
};

/**
 * ProjectDraft
 * 編集可能な作業データ
 */
export const projectDraftSchema = z.object({
  projectId: projectIdSchema,
  // Max length is per-event (event settings) and enforced in entity logic, not here
  pamphletText: z.string(),
  webContentJson: z.json().nullable(), // TipTap JSON
  ...detailInfoShape,
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
  pamphletText: z.string(),
  webContentJson: z.json().nullable(),
  ...requiredDetailInfoShape,
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
  pamphletText: z.string(),
  webContentJson: z.json().nullable(),
  ...requiredDetailInfoShape,
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
  returned: "差し戻し",
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
  message: z
    .string()
    .min(SUBMISSION_MESSAGE_MIN_LENGTH, "メッセージを入力してください")
    .max(
      SUBMISSION_MESSAGE_MAX_LENGTH,
      `メッセージは${SUBMISSION_MESSAGE_MAX_LENGTH}文字以内で入力してください`,
    ),
  createdAt: z.date(),
});

export type SubmissionMessage = z.infer<typeof submissionMessageSchema>;
