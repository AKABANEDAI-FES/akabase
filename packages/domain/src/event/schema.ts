import { z } from "zod";

export const eventIdSchema = z.string().brand<"EventId">();
export type EventId = z.infer<typeof eventIdSchema>;

export const tagIdSchema = z.string().brand<"TagId">();
export type TagId = z.infer<typeof tagIdSchema>;

export const projectCategoryIdSchema = z.string().brand<"ProjectCategoryId">();
export type ProjectCategoryId = z.infer<typeof projectCategoryIdSchema>;

export const placeIdSchema = z.string().brand<"PlaceId">();
export type PlaceId = z.infer<typeof placeIdSchema>;

export const deadlineIdSchema = z.string().brand<"DeadlineId">();
export type DeadlineId = z.infer<typeof deadlineIdSchema>;

/**
 * Schema constraints
 */
export const EVENT_NAME_MIN_LENGTH = 1;
export const EVENT_NAME_MAX_LENGTH = 100;
export const TAG_NAME_MIN_LENGTH = 1;
export const TAG_NAME_MAX_LENGTH = 100;
export const PROJECT_CATEGORY_NAME_MIN_LENGTH = 1;
export const PROJECT_CATEGORY_NAME_MAX_LENGTH = 100;
export const PLACE_NAME_MIN_LENGTH = 1;
export const PLACE_NAME_MAX_LENGTH = 100;
export const SLUG_MIN_LENGTH = 1;
export const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Event Status
 */
export const eventStatusSchema = z.enum(["active", "archived"]);

export type EventStatus = z.infer<typeof eventStatusSchema>;

/**
 * Event
 * イベント全体の設定を管理
 */
export const eventSchema = z.object({
  id: eventIdSchema,
  name: z
    .string()
    .min(EVENT_NAME_MIN_LENGTH, "イベント名を入力してください")
    .max(EVENT_NAME_MAX_LENGTH, "イベント名は100文字以内で入力してください"),
  slug: z
    .string()
    .min(SLUG_MIN_LENGTH, "スラッグを入力してください")
    .regex(SLUG_PATTERN, "スラッグは小文字英数字とハイフンのみ使用できます"),
  status: eventStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Event = z.infer<typeof eventSchema>;

/**
 * Tag
 * タグマスタ（イベント単位で管理）
 */
export const tagSchema = z.object({
  id: tagIdSchema,
  eventId: eventIdSchema,
  name: z
    .string()
    .min(TAG_NAME_MIN_LENGTH, "タグ名を入力してください")
    .max(TAG_NAME_MAX_LENGTH, "タグ名は100文字以内で入力してください"),
  displayOrder: z.number().int().nonnegative(),
  createdAt: z.date(),
});

export type Tag = z.infer<typeof tagSchema>;

/**
 * ProjectCategory
 * 企画区分マスタ（イベント単位で管理）
 */
export const projectCategorySchema = z.object({
  id: projectCategoryIdSchema,
  eventId: eventIdSchema,
  name: z
    .string()
    .min(PROJECT_CATEGORY_NAME_MIN_LENGTH, "企画区分名を入力してください")
    .max(PROJECT_CATEGORY_NAME_MAX_LENGTH, "企画区分名は100文字以内で入力してください"),
  displayOrder: z.number().int().nonnegative(),
  createdAt: z.date(),
});

export type ProjectCategory = z.infer<typeof projectCategorySchema>;

/**
 * Place
 * 場所マスタ（イベント単位で管理、階層構造）
 */
export const placeSchema = z.object({
  id: placeIdSchema,
  eventId: eventIdSchema,
  name: z
    .string()
    .min(PLACE_NAME_MIN_LENGTH, "場所名を入力してください")
    .max(PLACE_NAME_MAX_LENGTH, "場所名は100文字以内で入力してください"),
  parentId: placeIdSchema.nullable(),
  createdAt: z.date(),
});

export type Place = z.infer<typeof placeSchema>;

/**
 * Deadline Field Keys
 * フィールドごとの締切設定で使用可能なキー
 */
export const DEADLINE_FIELD_KEYS = ["pamphlet_text", "web_content", "tags", "detail_info"] as const;

export type DeadlineFieldKey = (typeof DEADLINE_FIELD_KEYS)[number];

/**
 * Deadline Field Labels
 * フィールドキーの日本語ラベル
 */
export const DEADLINE_FIELD_LABELS: Record<DeadlineFieldKey, string> = {
  pamphlet_text: "パンフレット説明文",
  web_content: "Webコンテンツ",
  tags: "タグ",
  detail_info: "企画詳細情報",
} as const;

export const deadlineRefinement = z.refine<{ startAt?: Date | null; deadlineAt: Date }>(
  (data) => {
    if (data.startAt) {
      return data.startAt < data.deadlineAt;
    }
    return true;
  },
  {
    message: "開始日時は終了日時より前に設定してください",
    path: ["startAt"],
  },
);

/**
 * Deadline
 * 締切設定（フィールド単位）
 */
export const deadlineSchema = z
  .object({
    id: deadlineIdSchema,
    eventId: eventIdSchema,
    fieldKey: z.enum(DEADLINE_FIELD_KEYS, {
      message: "フィールドを選択してください",
    }),
    startAt: z.date().optional(), // Optional: start time for editing window
    deadlineAt: z.date(),
    createdAt: z.date(),
  })
  .check(deadlineRefinement);

export type Deadline = z.infer<typeof deadlineSchema>;

/**
 * EventSettings
 * イベント詳細設定（イベント単位、events と 1:1）
 */
export const eventSettingsSchema = z.object({
  eventId: eventIdSchema,
  webContentDescription: z.string().nullable(),
  pamphletTextMaxLength: z.number().int().min(1).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EventSettings = z.infer<typeof eventSettingsSchema>;
